"use client";

import { useEffect, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

/** On the signed-in device: shows which computer is asking and approves it once the person types the four digits from that computer's screen. */
export function ApprovePair({ appId, code }: { appId: string; code: string }) {
  const [info, setInfo] = useState<{ label: string; expiresAt: string } | null>(null);
  const [digits, setDigits] = useState("");
  const [state, setState] = useState<"loading" | "ask" | "done" | "gone">("loading");
  const [error, setError] = useState<string | null>(null);
  const base = `/api/apps/${encodeURIComponent(appId)}/pair`;

  useEffect(() => {
    void (async () => {
      const r = await postJson<{ label: string; expiresAt: string }>(`${base}/info`, { code });
      if (!r.ok) {
        setError(r.message);
        return setState("gone");
      }
      setInfo(r.data);
      setState("ask");
    })();
  }, [base, code]);

  async function approve() {
    setError(null);
    const r = await postJson(`${base}/approve`, { code, verify: digits });
    if (!r.ok) {
      setError(r.message);
      if (r.code === "invalid_pairing" && /ended|Too many/.test(r.message)) setState("gone");
      return;
    }
    setState("done");
  }

  if (state === "loading") return <Card title="Sign in on another computer" prominent><p aria-live="polite">Checking the request…</p></Card>;
  if (state === "done") return <Card title="Approved" prominent><p>That computer is signed in. You can close this page.</p></Card>;
  if (state === "gone") return <Card title="Nothing to approve" prominent><Banner tone="warn">{error ?? "That sign-in request has ended."}</Banner><p className="small muted">If this was you, ask the other computer for a new one. If it was not, ignore it.</p></Card>;
  return (
    <Card title="Sign in on another computer?" prominent>
      <p><strong>{info?.label || "A browser"}</strong> is asking to sign in as you. Only approve if you started this yourself, just now.</p>
      <label className="stack">
        <span>Type the four digits shown on that computer</span>
        <input inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4} value={digits} onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))} aria-label="Four digits from the other computer" />
      </label>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Button variant="primary" onClick={() => void approve()} disabled={digits.length !== 4}>Approve</Button>
    </Card>
  );
}
