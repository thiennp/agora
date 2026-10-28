"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useScope } from "./ScopeContext";

export interface QuestionProps {
  id: string;
  as: "a" | "b";
  text: string;
  answers: { id: "yes" | "no"; label: string }[];
  canRemember: boolean;
  language: string;
}

/** A question the agent could not decide alone: one tap to answer. "Remember" is offered only where a standing rule is allowed. */
export function QuestionCard({ id, as, text, answers, canRemember, language }: QuestionProps) {
  const router = useRouter();
  const { post } = useScope();
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function answer(a: "yes" | "no") {
    setBusy(true);
    setError(null);
    const r = await post(`/api/owner-questions/${id}/answer`, { as, answer: a, ...(remember && a === "yes" ? { rememberDays: 30 } : {}) });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
  }
  return (
    <article className="card prominent" aria-label="Question from your agent">
      <div className="row between">
        <h3>Your agent needs you</h3>
        <Badge tone="info">{language.toUpperCase()}</Badge>
      </div>
      <p lang={language}>{text}</p>
      {canRemember ? (
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember a yes as a standing rule for 30 days (you can turn it off any time)
        </label>
      ) : null}
      <div className="row" style={{ marginTop: 8 }}>
        {answers.map((a) => (
          <Button key={a.id} variant={a.id === "yes" ? "primary" : "default"} disabled={busy} onClick={() => answer(a.id)} lang={language}>{a.label}</Button>
        ))}
      </div>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </article>
  );
}
