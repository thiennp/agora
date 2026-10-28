"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

interface Joined { memberId: string; recoveryCode?: string; notice?: string; alreadyMember?: boolean }

/** The tap on "Join" (BR-42, BR-45): makes a membership and a session on this phone, then shows the recovery code once. */
export function JoinForm({ appId, appName, noun }: { appId: string; appName: string; noun: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<Joined | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const r = await postJson<Joined>(`/api/apps/${encodeURIComponent(appId)}/join`, name.trim() ? { name: name.trim() } : {});
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (r.data.alreadyMember) return router.refresh();
    setJoined(r.data);
  }

  if (joined) {
    return (
      <Card title={`Welcome to ${appName}`} prominent>
        <p>You are in. Keep this recovery code: it is the only way back in on a new phone.</p>
        <p><code className="recovery">{joined.recoveryCode}</code></p>
        <p className="small muted">{joined.notice}</p>
        <Button variant="primary" onClick={() => router.refresh()}>I have saved it</Button>
      </Card>
    );
  }
  return (
    <Card title={`Join ${appName}`} prominent>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void join(); }}>
        <label className="stack">
          <span className="small muted">What should other {noun}s call you? (optional)</span>
          <input type="text" value={name} maxLength={60} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </label>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Joining…" : "Join"}</Button>
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <p className="small muted">No account is made. Your phone holds a private session, and you get a recovery code once.</p>
      </form>
    </Card>
  );
}
