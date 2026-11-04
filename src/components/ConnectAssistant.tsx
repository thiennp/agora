"use client";

import { useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { CopyPrompt } from "./CopyPrompt";
import { postJson } from "./post";

/**
 * "Connect your assistant": makes a one-time code and the text to paste into the person's own assistant (Muse, Meta AI, any bot). The
 * assistant then reads the app, tells the person in its own words what it knows and can do, and keeps them posted. Read only.
 */
export function ConnectAssistant({ appId, appName }: { appId: string; appName: string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function make() {
    setBusy(true);
    setError(null);
    const r = await postJson<{ prompt: string }>(`/api/apps/${encodeURIComponent(appId)}/connect-code`, {});
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setPrompt(r.data.prompt);
  }
  return (
    <Card title="Connect your assistant">
      <p>Optional, and only for an assistant that can send web requests. It then reads, explains and tells you what is new about {appName}, and can never decide anything for you. An assistant that cannot (Meta AI cannot) does not need this: you open the pages yourself, and it only writes links.</p>
      {prompt ? (
        <div className="stack">
          <CopyPrompt text={prompt} />
          <p className="small muted">Paste it into your assistant&apos;s chat. The code inside works once and ends in 15 minutes; make a new one if it ends.</p>
        </div>
      ) : (
        <Button variant="primary" onClick={() => void make()} disabled={busy}>{busy ? "Making it…" : "Get the message for my assistant"}</Button>
      )}
      {error ? <p className="small error-text" role="alert">{error}</p> : null}
    </Card>
  );
}
