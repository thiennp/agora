"use client";

import { useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";
import { useWebMcpTools } from "./WebMcp";

interface Connected {
  key: string;
  about: { name: string; purpose: string; features: string[]; limits: string[]; rules: string[]; forWhom: string };
  next: string;
  cannot: string;
}

/**
 * The page behind the connect message (`/app/{app}/connect?code=…`). The person's assistant opens this link and taps Connect; it swaps the
 * one-time code for a read-only key and shows what the app is for, so the assistant can explain it to the person. The WebMCP tool
 * `connect_assistant` does exactly what the button does. No code is typed; the link carries it (works once, ends in 15 minutes).
 */
export function ConnectWithCode({ appId, appName, code }: { appId: string; appName: string; code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Connected | null>(null);

  async function connect(): Promise<Connected | null> {
    setBusy(true);
    setError(null);
    const r = await postJson<Connected>(`/api/apps/${encodeURIComponent(appId)}/connect`, { code, label: "My assistant" });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return null;
    }
    setDone(r.data);
    return r.data;
  }

  useWebMcpTools([
    {
      name: "connect_assistant",
      description: `Connect the person's assistant to "${appName}" with the one-time code in this link. Read only. Call it only after the person said yes. The answer says what the app is for: explain it to the person in your own words.`,
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const c = await connect();
        if (!c) throw new Error(error ?? "Could not connect. Ask the person for a new message.");
        return JSON.stringify({ connected: true, about: c.about, next: c.next, cannot: c.cannot });
      },
    },
  ]);

  if (done) {
    const { about } = done;
    return (
      <Card title={`Connected to ${appName}`} prominent>
        <p><strong>{about.purpose}</strong></p>
        <p className="small muted">For {about.forWhom}.</p>
        <p>{done.next}</p>
        <p className="muted">{done.cannot}</p>
        <h2 className="small">What the app offers</h2>
        <ul className="list">{about.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <h2 className="small">What it does not do</h2>
        <ul className="list">{about.limits.map((f) => <li key={f}>{f}</li>)}</ul>
        <details>
          <summary className="small">Read-only key, only for an assistant that can send requests</summary>
          <p className="small muted">Shown once. Keep it private; never put it in a link.</p>
          <p><code className="recovery">{done.key}</code></p>
        </details>
      </Card>
    );
  }
  return (
    <Card title={`Connect your assistant to ${appName}`} prominent>
      <p>This lets the assistant read what is new and explain it to you. It can never answer, confirm, post or agree to anything for you.</p>
      {!code ? <Banner tone="bad">This link has no connect code. Make a new message in the app and use that link.</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Button variant="primary" onClick={() => void connect()} disabled={busy || !code}>{busy ? "Connecting…" : "Connect"}</Button>
    </Card>
  );
}
