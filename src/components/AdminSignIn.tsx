"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

/**
 * The way into an app's admin dashboard from a browser. The assistant that built the app holds the creator's first session, so the
 * person arrives here with the recovery code it gave them. The code goes in the request body (never a URL) and, as with any recovery,
 * ends the older sessions and issues a new code.
 */
export function AdminSignIn({ appId, appName }: { appId: string; appName: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await postJson<{ role: string; recoveryCode: string }>(`/api/apps/${encodeURIComponent(appId)}/recover`, { code });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (r.data.role !== "creator") return setError("That code is not the admin's code for this app.");
    setFresh(r.data.recoveryCode);
  }

  if (fresh) {
    return (
      <Card title="You are in" prominent>
        <p>Your old code no longer works. Keep this new recovery code: it is the only way back on a new phone.</p>
        <p><code className="recovery">{fresh}</code></p>
        <Button variant="primary" onClick={() => router.replace(`/app/${encodeURIComponent(appId)}`)}>Open the dashboard</Button>
      </Card>
    );
  }
  return (
    <Card title={`Admin of ${appName}`} prominent>
      <form className="stack" onSubmit={submit}>
        <label className="stack">
          <span>Recovery code from your assistant</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} required />
        </label>
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <Button variant="primary" type="submit" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Open the dashboard"}</Button>
      </form>
      <p className="small muted">Only the app&apos;s admin can see the dashboard.</p>
    </Card>
  );
}
