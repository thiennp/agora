"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useScope } from "./ScopeContext";

const REASONS: [string, string][] = [["too_far", "Too far"], ["wrong_size", "Wrong size"], ["condition", "Condition"], ["price", "Terms"], ["timing", "Timing"], ["other", "Something else"]];

/** The owner's yes or no. A deal is final only when both owners have said yes; declining asks why, so the agent can learn. */
export function ConfirmCard({ id, dealId, as, item, role }: { id: string; dealId: string; as: "a" | "b"; item: string; role: string }) {
  const router = useRouter();
  const { post, other } = useScope();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("too_far");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function decide(decision: "confirm" | "decline") {
    setBusy(true);
    setError(null);
    const r = await post(`/api/deals/${dealId}/confirm`, { as, cardId: id, decision, ...(decision === "decline" ? { reason: { code: reason } } : {}) });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
  }
  return (
    <article className="card prominent" aria-label="Confirm or decline">
      <div className="row between">
        <h3>Confirm this deal?</h3>
        <Badge tone="accent">You are {role}</Badge>
      </div>
      <p>{item}</p>
      <p className="muted small">The agents agree, but nothing is final until you and {other} both confirm.</p>
      {declining ? (
        <div className="stack">
          <label htmlFor={`why-${id}`}>Why not? (this helps your agent learn)</label>
          <select id={`why-${id}`} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="row">
            <Button variant="danger" disabled={busy} onClick={() => decide("decline")}>Decline</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDeclining(false)}>Back</Button>
          </div>
        </div>
      ) : (
        <div className="row">
          <Button variant="primary" disabled={busy} onClick={() => decide("confirm")}>Confirm</Button>
          <Button disabled={busy} onClick={() => setDeclining(true)}>Decline…</Button>
        </div>
      )}
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </article>
  );
}
