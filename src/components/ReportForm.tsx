"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { useScope } from "./ScopeContext";

const REASONS: [string, string][] = [["scam", "Looks like a scam"], ["contact_harvesting", "Asking for personal details"], ["off_platform_payment", "Asking me to pay outside"], ["abusive", "Rude or abusive"], ["no_show", "Did not show up"], ["other", "Something else"]];

/** Two taps: pick a reason and report. The deal stops, and the other side is never told who reported. */
export function ReportForm({ dealId, as }: { dealId: string; as: "a" | "b" }) {
  const router = useRouter();
  const { post, other } = useScope();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const [reason, setReason] = useState("scam");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <details>
      <summary>Report a problem</summary>
      <div className="stack" style={{ marginTop: 8 }}>
        <label htmlFor="report-reason">What happened?</label>
        <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <p className="muted small">The deal stops, held items are freed, and a tamper-evident record of message hashes (not the messages) is kept. {cap(other)} cannot see who reported.</p>
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await post("/api/reports", { as, dealId, reason });
            setBusy(false);
            setMsg(r.ok ? "Reported. This deal has stopped." : r.message);
            if (r.ok) router.refresh();
          }}
        >
          Report and stop this deal
        </Button>
        {msg ? <div role="status" className="small">{msg}</div> : null}
      </div>
    </details>
  );
}
