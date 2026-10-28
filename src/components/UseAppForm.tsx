"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

interface Joined { memberId: string; recoveryCode?: string; notice?: string; alreadyMember?: boolean }

/**
 * Opening an app's page as a person is the first use (BR-42, BR-45): no sign-up form. This makes their light-identity record and a
 * session on this phone through the existing join call, then shows the recovery code once. A page read by an assistant runs no script,
 * so it creates nothing. A phone that already has a session keeps it.
 */
export function UseAppForm({ appId, appName }: { appId: string; appName: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Joined | null>(null);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    const r = await postJson<Joined>(`/api/apps/${encodeURIComponent(appId)}/join`, {});
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (r.data.alreadyMember) return router.refresh();
    setCreated(r.data);
  }, [appId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  if (created) {
    return (
      <Card title={`You are set up to use ${appName}`} prominent>
        <p>Keep this recovery code: it is the only way back to your record on a new phone.</p>
        <p><code className="recovery">{created.recoveryCode}</code></p>
        <p className="small muted">{created.notice}</p>
        <Button variant="primary" onClick={() => router.refresh()}>I have saved it</Button>
      </Card>
    );
  }
  return (
    <Card title={`Use ${appName}`} prominent>
      {error ? (
        <div className="stack">
          <Banner tone="bad">{error}</Banner>
          <Button variant="primary" onClick={() => void start()} disabled={busy}>Try again</Button>
        </div>
      ) : (
        <p aria-live="polite">{busy ? "Setting up your private record in this app…" : "Done."}</p>
      )}
      <p className="small muted">No sign-up and no password. Your phone holds a private session.</p>
    </Card>
  );
}
