"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { postJson } from "./post";

/** Owners never write to each other: this goes to your own agent, which screens, translates and delivers it. */
export function ChatBox({ dealId, as }: { dealId: string; as: "a" | "b" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "warn" | "bad"; text: string } | null>(null);
  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setNote(null);
    const r = await postJson<{ status: string; notice: string | null }>(`/api/deals/${dealId}/relay`, { as, text });
    setBusy(false);
    if (!r.ok) return setNote({ tone: "bad", text: r.message });
    setNote(r.data.status === "delivered" ? { tone: "ok", text: "Sent through your agent." } : { tone: r.data.status === "blocked" ? "bad" : "warn", text: r.data.notice ?? "" });
    if (r.data.status !== "blocked") setText("");
    router.refresh();
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="stack">
      <label htmlFor="chat-text">Message to the other family, via your agent</label>
      <textarea id="chat-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="For example: Is Saturday morning OK for you?" />
      <div className="row between">
        <span className="muted small">{text.length}/1000 · phone numbers, emails and links are removed; addresses and payment requests are blocked.</span>
        <Button variant="primary" disabled={busy || !text.trim()} onClick={() => void send()}>{busy ? "Sending…" : "Send"}</Button>
      </div>
      {note ? <div className={note.tone === "ok" ? "ok-text" : "error-text"} role="status">{note.text}</div> : null}
    </form>
  );
}
