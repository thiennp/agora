"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { IntakeDraft, IntakeResult } from "@/features/intake/public-api/client";
import { Badge } from "./Badge";
import { Banner } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";
import type { ItemOptions } from "./ItemForm";

const MAX_SIDE = 1600;
const NO_PICTURE = { person: "a person was in the picture", text: "readable text was in the picture", no_outline: "it could not be outlined", unchecked: "it could not be checked for privacy" } as const;

/** Draw the photo onto a canvas at a sensible size, upright, as JPEG. That also drops the camera's location and time. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

interface Row {
  draft: IntakeDraft;
  include: boolean;
  name: string;
  category: string;
  size: string;
  condition: string;
}

/**
 * Give-away by photo: choose a photo, the agent names the items and cuts a picture of each, you check them and list the ones you want.
 * The photo itself is never kept; only the item pictures are (shown here), and only for items you list.
 */
export function PhotoIntake({ as, options }: { as: "a" | "b"; options: ItemOptions }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "warn" | "bad" | "accent"; text: string } | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<{ capped: boolean; simulated: boolean } | null>(null);
  const defaultCondition = options.conditions.includes("good") ? "good" : options.conditions[0]!;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setRows(null);
    let image: string;
    try {
      image = await shrink(file);
    } catch {
      setBusy(false);
      return setMsg({ tone: "warn", text: "This browser could not open that photo. Try a JPEG or PNG." });
    }
    const r = await postJson<IntakeResult>("/api/intake/photo", { as, image });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!r.ok) return setMsg({ tone: "bad", text: r.message });
    const d = r.data;
    if (d.status !== "ok") return setMsg({ tone: d.status === "unavailable" ? "bad" : "warn", text: d.message });
    setNote({ capped: d.capped, simulated: d.simulated });
    setRows(d.drafts.map((x) => ({ draft: x, include: true, name: x.name, category: x.category, size: x.size ?? "", condition: x.condition ?? defaultCondition })));
  }

  async function list() {
    if (!rows) return;
    setBusy(true);
    setMsg(null);
    const left: Row[] = [];
    const problems: string[] = [];
    let done = 0;
    for (const row of rows) {
      if (!row.include) continue;
      const r = await postJson<{ flags: string[] }>("/api/items", {
        as,
        kind: "offer",
        category: row.category,
        size: row.size || undefined,
        condition: row.condition,
        description: row.name || undefined,
        draftId: row.draft.crop ? row.draft.id : undefined,
      });
      if (r.ok) {
        done += 1;
        if (r.data.flags.length) problems.push(`${row.name}: ${r.data.flags.join(" ")}`);
      } else {
        left.push(row);
        problems.push(`${row.name}: ${r.message}`);
      }
    }
    setBusy(false);
    setRows(left.length ? left : null);
    setMsg({ tone: problems.length ? "warn" : "accent", text: `${done} listed.${problems.length ? ` ${problems.join(" ")}` : " Your agent is looking."}` });
    router.refresh();
  }

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <div className="stack">
      <p className="muted small">Lay the items flat on the floor or a table, apart from each other, in good light. Keep people and papers with names or addresses out of the picture. The photo is not kept, only a picture of each item you list.</p>
      <input ref={input} id="photo-file" type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <div className="row">
        <Button variant="primary" disabled={busy} onClick={() => input.current?.click()}>{busy && !rows ? "Looking at your photo…" : "Choose or take a photo"}</Button>
      </div>
      {msg ? <Banner tone={msg.tone}>{msg.text}</Banner> : null}
      {note?.simulated && rows ? <Banner tone="info">Demo mode: no model looked at your photo. These are sample items cut from fixed places on it, so please check each one.</Banner> : null}
      {note?.capped && rows ? <Banner tone="warn">There were more items than I can list at once. These are the first ones; take another photo of the rest.</Banner> : null}
      {rows ? (
        <div className="stack">
          {rows.map((row, i) => {
            const sizes = options.sizes[row.category] ?? [];
            return (
              <div key={row.draft.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                  {row.draft.crop ? (
                    <img src={row.draft.crop} alt={row.name} width={96} height={96} style={{ objectFit: "cover", borderRadius: 8, flex: "none" }} />
                  ) : (
                    <div className="muted small" style={{ width: 96, flex: "none" }}>No picture: {row.draft.noCropReason ? NO_PICTURE[row.draft.noCropReason] : "none kept"}.</div>
                  )}
                  <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                    <label className="check"><input type="checkbox" checked={row.include} onChange={(e) => update(i, { include: e.target.checked })} /> List this</label>
                    {row.draft.needsCheck ? <Badge tone="warn">Please check</Badge> : null}
                    <input type="text" aria-label="Name" maxLength={80} value={row.name} onChange={(e) => update(i, { name: e.target.value })} />
                    <select aria-label="Kind" value={row.category} onChange={(e) => update(i, { category: e.target.value, size: "" })}>
                      {options.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    {sizes.length ? (
                      <select aria-label="Size" value={row.size} onChange={(e) => update(i, { size: e.target.value })}>
                        <option value="">Size: not sure</option>
                        {sizes.map((s) => <option key={s} value={s}>Size {s}</option>)}
                      </select>
                    ) : null}
                    <select aria-label="Condition" value={row.condition} onChange={(e) => update(i, { condition: e.target.value })}>
                      {options.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="row">
            <Button variant="primary" disabled={busy || !rows.some((r) => r.include)} onClick={() => void list()}>{busy ? "Listing…" : `List ${rows.filter((r) => r.include).length} item${rows.filter((r) => r.include).length === 1 ? "" : "s"}`}</Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setRows(null); setMsg(null); }}>Start over</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
