"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";
import { useWebMcpTools } from "./WebMcp";

interface Joined { memberId: string; recoveryCode?: string; notice?: string; alreadyMember?: boolean }

/**
 * Opening an app's page shows what it is for; the person (or their assistant, in a browser) taps Join to make their light-identity record
 * and a session on this browser through the join call (BR-42, BR-45): no sign-up form. The recovery code is shown once. A page read as
 * markdown or by an assistant that runs no script creates nothing. A browser that already has a session keeps it. The WebMCP tool
 * `join_app` does exactly what the button does.
 */
export function UseAppForm({ appId, appName }: { appId: string; appName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Joined | null>(null);

  async function join(): Promise<Joined | null> {
    setBusy(true);
    setError(null);
    const r = await postJson<Joined>(`/api/apps/${encodeURIComponent(appId)}/join`, {});
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return null;
    }
    if (r.data.alreadyMember) router.refresh();
    else setCreated(r.data);
    return r.data;
  }

  useWebMcpTools([
    {
      name: "join_app",
      description: `Join the app "${appName}" in this browser: makes the person's private record here. Call it only after the person said yes to joining. The answer holds a recovery code: give it to the person, it is their only way back on a new browser.`,
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const j = await join();
        if (!j) throw new Error(error ?? "Could not join. Try again.");
        return j.alreadyMember ? "This browser already has a record in this app." : `Joined. Recovery code (show it to the person, once): ${j.recoveryCode}`;
      },
    },
  ]);

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
      <p>Tap Join to make your private record in this app. No sign-up and no password: this browser holds a private session.</p>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Button variant="primary" onClick={() => void join()} disabled={busy}>{busy ? "Joining…" : `Join ${appName}`}</Button>
    </Card>
  );
}
