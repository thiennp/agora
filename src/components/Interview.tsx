"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { postJson } from "./post";

interface Option { id: string; label: string }
interface Question { step: string; n: number; of: number; ask: string; hint?: string; options: Option[]; otherLabel: string; freeText: boolean; maxLength: number }
interface Line { label: string; value: string }
type Turn =
  | { kind: "ask"; question: Question; said: Line[] }
  | { kind: "review"; draft: Record<string, unknown>; lines: Line[]; notes: string[]; promise: string; source: "model" | "code" };
interface Answer { step: string; choice?: string; text?: string }
interface Built { path: string; recoveryCode: string; notice: string; app: { name: string } }

const NONE: Answer[] = [];
const KEY = "agora.interview.answers";
const read = (): Answer[] => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const save = (a: Answer[]) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // Private mode: the interview still works, it just cannot resume after a reload.
  }
};

/** The create-an-app interview on the phone (BR-40): one question card at a time with tap answers, then one yes. */
export function Interview({ initial = NONE }: { initial?: Answer[] }) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [built, setBuilt] = useState<Built | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const go = useCallback(async (next: Answer[]) => {
    setBusy(true);
    setError(null);
    const r = await postJson<Turn>("/api/interview", { answers: next });
    setBusy(false);
    if (!r.ok) return setError(r.message), false;
    setAnswers(next);
    save(next);
    setTurn(r.data);
    setTyping(false);
    setText("");
    // Move focus to the new card for screen readers, but do not scroll the page on the first load.
    if (!first.current) top.current?.focus();
    first.current = false;
    return true;
  }, []);

  useEffect(() => {
    // Resume where the person left off; if the saved answers no longer fit, start from the first question.
    void (async () => {
      // A draft link from an assistant wins over saved answers; both only fill in answers, nothing is built before the tap.
      const saved = initial.length ? initial : read();
      if (!(await go(saved)) && saved.length) {
        setError(null);
        await go([]);
      }
    })();
  }, [go, initial]);

  const answer = (a: Omit<Answer, "step">) => turn?.kind === "ask" && go([...answers, { step: turn.question.step, ...a }]);

  async function build() {
    if (turn?.kind !== "review") return;
    setBusy(true);
    setError(null);
    const r = await postJson<Built>("/api/interview/build", { draft: turn.draft });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    save([]);
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

  return (
    <div className="stack-lg">
      <div ref={top} tabIndex={-1} />
      {!turn ? <Card>{busy ? <p role="status">Opening the questions… (If nothing appears, JavaScript is off in this browser.)</p> : <Banner tone="bad">{error ?? "Could not start."}</Banner>}</Card> : null}
      {turn?.kind === "ask" ? (
        <Card prominent as="article">
          <p className="small muted" role="status">Question {turn.question.n} of {turn.question.of}</p>
          <progress className="steps" value={turn.question.n - 1} max={turn.question.of} aria-label="Progress" />
          <h2>{turn.question.ask}</h2>
          {turn.question.hint ? <p className="muted">{turn.question.hint}</p> : null}
          <div className="options" role="group" aria-label="Answers">
            {turn.question.options.map((o) => (
              <Button key={o.id} className="option" disabled={busy} onClick={() => answer(turn.question.freeText ? { text: o.label } : { choice: o.id })}>{o.label}</Button>
            ))}
            {!typing && turn.question.options.length > 0 ? (
              <Button className="option" variant="ghost" disabled={busy} onClick={() => setTyping(true)}>{turn.question.otherLabel}</Button>
            ) : null}
          </div>
          {typing || turn.question.options.length === 0 ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) void answer({ text });
              }}
            >
              <label className="stack">
                <span className="small muted">Your own words</span>
                <input type="text" value={text} maxLength={turn.question.maxLength} onChange={(e) => setText(e.target.value)} autoFocus={typing} enterKeyHint="send" />
              </label>
              <Button type="submit" variant="primary" disabled={busy || !text.trim()}>Send</Button>
            </form>
          ) : null}
          {error ? <div className="error-text" role="alert">{error}</div> : null}
          {answers.length > 0 ? <Button variant="ghost" disabled={busy} onClick={() => go(answers.slice(0, -1))}>Go back</Button> : null}
        </Card>
      ) : null}
      {turn?.kind === "review" ? (
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
          <div className="row">
            <Button variant="primary" disabled={busy} onClick={build}>Build it</Button>
            <Button variant="ghost" disabled={busy} onClick={() => go(answers.slice(0, -1))}>Change something</Button>
          </div>
        </Card>
      ) : null}
      {turn && turn.kind === "ask" && turn.said.length > 0 ? (
        <details className="said">
          <summary className="small muted">What you have told me</summary>
          <dl className="summary">
            {turn.said.map((l) => (
              <div key={l.label}>
                <dt className="small muted">{l.label}</dt>
                <dd>{l.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
