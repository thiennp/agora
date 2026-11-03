"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson, putJsonQuietly } from "./post";

interface Line { label: string; value: string }
interface Answer { step: string; choice?: string; text?: string }
type Turn =
  | { kind: "ask"; question: { ask: string } }
  | { kind: "review"; draft: Record<string, unknown>; lines: Line[]; description: { purpose: string; features: string[]; rules: string[]; limits: string[] }; notes: string[]; promise: string };
interface Built { path: string; recoveryCode: string; notice: string; app: { name: string } }

/**
 * The draft page (BR-40): checks the answers, shows the description and rules the model drafted and code checked, then one tap builds the app.
 * An assistant never has to send a request: it fills `/start` (or opens a link that does) and the person, or the assistant after the person's typed yes, taps.
 */
export function DraftBuild({ answers, projectId }: { answers: Answer[]; projectId?: string }) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [project, setProject] = useState<string | undefined>(projectId);

  useEffect(() => {
    void (async () => {
      const r = await postJson<Turn>("/api/interview", { answers });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      setTurn(r.data);
      // Progress for the operator (BR-48), recorded by the page itself so no assistant has to send a request. Never blocks or fails the person.
      const id = projectId ?? (await postJson<{ projectId: string }>("/api/interview/projects", { source: "assistant" }).then((o) => (o.ok ? o.data.projectId : undefined)));
      if (id) {
        setProject(id);
        await putJsonQuietly(`/api/interview/projects/${id}`, { answers });
      }
    })();
  }, [answers, projectId]);

  async function build() {
    if (turn?.kind !== "review") return;
    setBusy(true);
    setError(null);
    const r = await postJson<Built>("/api/interview/build", { draft: turn.draft, projectId: project });
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
      <section aria-label="What your app says about itself" className="stack">
        <p>{turn.description.purpose}</p>
        <ul>{turn.description.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <h3 className="small muted">The rules of your app</h3>
        <ul>{turn.description.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
      {turn.notes.map((n) => <Banner key={n} tone="info">{n}</Banner>)}
      <Banner tone="info">{turn.promise}</Banner>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
      <Button variant="primary" disabled={busy} onClick={build}>Build it</Button>
    </Card>
  );
}
