"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Answer } from "@/lib/docs-kb";
import { Button } from "./Button";
import { postJson } from "./post";

type Turn = { id: number; question: string; answer?: Answer; error?: string };

const EXAMPLES = [
  "What changes when we go from 10 million to 100 million users?",
  "Why does the gatekeeper decide instead of the model?",
  "How do I add a new app?",
  "What does BR-38 require?",
];

/** Ask the project docs a question; every answer shows the passages it came from, or says the docs do not cover it. */
export function DocsChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const next = useRef(1);

  async function send(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const id = next.current++;
    setTurns((t) => [...t, { id, question: q }]);
    setText("");
    setBusy(true);
    const r = await postJson<Answer>("/api/docs/ask", { question: q });
    setBusy(false);
    setTurns((t) => t.map((x) => (x.id === id ? (r.ok ? { ...x, answer: r.data } : { ...x, error: r.message }) : x)));
  }

  return (
    <div className="stack">
      <div className="bubbles" role="log" aria-live="polite" aria-label="Conversation with the docs">
        {turns.length === 0 ? (
          <div className="row" aria-label="Example questions">
            {EXAMPLES.map((e) => <button key={e} type="button" className="btn ghost" onClick={() => void send(e)}>{e}</button>)}
          </div>
        ) : null}
        {turns.map((t) => (
          <div key={t.id} className="stack">
            <div className="bubble me">{t.question}</div>
            <div className="bubble">
              {t.error ? <span className="error-text">{t.error}</span> : !t.answer ? <span className="muted">Searching the docs…</span> : <AnswerView a={t.answer} />}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="stack">
        <label htmlFor="docs-q">Ask about the architecture, requirements, scale, security or how to build an app</label>
        <textarea id="docs-q" value={text} maxLength={500} placeholder="For example: how does a deal become confirmed?"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }} />
        <div className="row between">
          <span className="muted small">{text.length}/500 · answers are copied from the docs with their source, or the chat says it found nothing.</span>
          <Button variant="primary" disabled={busy || text.trim().length < 3} onClick={() => void send(text)}>{busy ? "Searching…" : "Ask"}</Button>
        </div>
      </form>
    </div>
  );
}

function AnswerView({ a }: { a: Answer }) {
  return (
    <div className="stack">
      <div style={{ whiteSpace: "pre-wrap" }}>{a.answer}</div>
      {a.note ? <div className="muted small">{a.note}</div> : null}
      {a.citations.length ? (
        <ol className="small" aria-label="Sources">
          {a.citations.map((c) => (
            <li key={c.n}>
              <Link href={`/docs/read?path=${encodeURIComponent(c.path)}#L${c.startLine}`}>{c.path}:{c.startLine}-{c.endLine}</Link>
              {c.heading ? <span className="muted"> › {c.heading}</span> : null}
            </li>
          ))}
        </ol>
      ) : a.related.length ? (
        <div className="muted small">
          Closest topics:{" "}
          {a.related.map((r) => <Link key={r.path + r.heading} href={`/docs/read?path=${encodeURIComponent(r.path)}`}>{r.path}</Link>).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}
        </div>
      ) : null}
    </div>
  );
}
