"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { postJson } from "./post";

export interface ItemOptions {
  categories: { id: string; label: string }[];
  sizes: Record<string, string[]>;
  conditions: string[];
}

/** Add something you are giving away or looking for. Sizes and conditions come from the app, so any app gets its own form. */
export function ItemForm({ as, options }: { as: "a" | "b"; options: ItemOptions }) {
  const router = useRouter();
  const [kind, setKind] = useState<"offer" | "want">("want");
  const [category, setCategory] = useState(options.categories[0]!.id);
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState(options.conditions[0]!);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sizes = options.sizes[category] ?? [];
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = await postJson<{ flags: string[] }>("/api/items", { as, kind, category, size: size || undefined, condition: kind === "offer" ? condition : undefined, description: description || undefined });
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setDescription("");
        setMsg({ ok: true, text: r.data.flags.length ? `Listed. Note: ${r.data.flags.join(" ")}` : "Listed. Your agent is looking." });
        router.refresh();
      }}
    >
      <fieldset className="row" style={{ border: 0, padding: 0, margin: 0, gap: 16 }}>
        <legend className="small" style={{ fontWeight: 600 }}>I want to</legend>
        <label className="check"><input type="radio" name="kind" checked={kind === "want"} onChange={() => setKind("want")} /> find something</label>
        <label className="check"><input type="radio" name="kind" checked={kind === "offer"} onChange={() => setKind("offer")} /> give something</label>
      </fieldset>
      <label htmlFor="item-category">What kind</label>
      <select id="item-category" value={category} onChange={(e) => { setCategory(e.target.value); setSize(""); }}>
        {options.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      {sizes.length ? (
        <>
          <label htmlFor="item-size">Size</label>
          <select id="item-size" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Any</option>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </>
      ) : null}
      {kind === "offer" ? (
        <>
          <label htmlFor="item-condition">Condition</label>
          <select id="item-condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
            {options.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </>
      ) : null}
      <label htmlFor="item-description">A few words (optional)</label>
      <input id="item-description" type="text" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button variant="primary" type="submit" disabled={busy}>{busy ? "Listing…" : "List it"}</Button>
      {msg ? <div role={msg.ok ? "status" : "alert"} className={msg.ok ? "small" : "error-text"}>{msg.text}</div> : null}
    </form>
  );
}
