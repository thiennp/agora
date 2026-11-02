"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

interface Line { label: string; value: string }
interface Answer { step: string; choice?: string; text?: string }
type Turn =
  | { kind: "ask"; question: { ask: string } }
  | { kind: "review"; draft: Record<string, unknown>; lines: Line[]; notes: string[]; promise: string };
interface Built { path: string; recoveryCode: string; notice: string; app: { name: string } }

/** The draft link's page (BR-40): checks the answers from an assistant that cannot send web requests, then one tap builds the app. */
export function DraftBuild({ answers, projectId }: { answers: Answer[]; projectId?: string }) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await postJson<Turn>("/api/interview", { answers });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      setTurn(r.data);
    })();
  }, [answers]);

  async function build() {
    if (turn?.kind !== "review") return;
    setBusy(true);
    setError(null);
    const r = await postJson<Built>("/api/interview/build", { draft: turn.draft, projectId });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setBuilt(r.data);
  }

  if (built) {
    return (
      <div className="stack-lg">
        <Card title={`${built.app.name} is ready`} prominent>
          <p>Your app is built and you are its creator. Open it to see it and share it.</p>
          <p><Link className="btn primary" href={built.path}>Open my app</Link></p>
        </Card>
        <Card title="Keep your recovery code">
          <p><code className="recovery">{built.recoveryCode}</code></p>
          <p className="small muted">{built.notice}</p>
        </Card>
      </div>
    );
  }
  if (!turn) return <Card>{busy ? <p role="status">Checking your app…</p> : <Banner tone="bad">{error ?? "Could not check the link."}</Banner>}</Card>;
  if (turn.kind === "ask") return <Banner tone="warn">The link is missing an answer ({turn.question.ask}). Ask your assistant to make a complete link.</Banner>;
  return (
    <Card prominent as="article" title="Here is your app">
      <dl className="summary">
        {turn.lines.map((l) => (
          <div key={l.label}>
            <dt className="small muted">{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
      </dl>
      {turn.notes.map((n) => <Banner key={n} tone="info">{n}</Banner>)}
      <Banner tone="info">{turn.promise}</Banner>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
      <Button variant="primary" disabled={busy} onClick={build}>Build it</Button>
    </Card>
  );
}
