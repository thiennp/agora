"use client";

import { useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { DraftBuild } from "./DraftBuild";

export interface FormStep {
  id: string;
  ask: string;
  hint?: string;
  /** Tap answers: the short code and the words shown. */
  options: Array<{ id: string; label: string }>;
  maxLength: number;
}

interface Answer { step: string; choice?: string; text?: string }

/**
 * The create-an-app form (BR-40) on Agora's own page. An assistant that cannot send web requests (Meta AI cannot, not even from a page it
 * builds) writes a link that fills this form in; the person reads their app here, changes what they like and taps once. Nothing is stored
 * until they tap "Build it" on the checked summary that follows.
 */
export function StartForm({ steps, initial, projectId, ready }: { steps: FormStep[]; initial: Record<string, string>; projectId?: string; ready: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [answers, setAnswers] = useState<Answer[] | null>(ready ? steps.map((s) => answerOf(s, initial[s.id] ?? "")) : null);
  const [error, setError] = useState<string | null>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const missing = steps.find((s) => !(values[s.id] ?? "").trim());
    if (missing) return setError(`Please answer: ${missing.ask}`);
    setError(null);
    setAnswers(steps.map((s) => answerOf(s, values[s.id] ?? "")));
  }

  if (answers) {
    return (
      <div className="stack-lg">
        <DraftBuild answers={answers} projectId={projectId} />
        <p><Button variant="ghost" onClick={() => setAnswers(null)}>Change an answer</Button></p>
      </div>
    );
  }
  return (
    <form className="stack-lg" onSubmit={check}>
      {steps.map((s) => (
        <Card key={s.id} title={s.ask}>
          {s.hint ? <p className="small muted">{s.hint}</p> : null}
          {s.options.length ? (
            <div className="stack" role="radiogroup" aria-label={s.ask}>
              {s.options.map((o) => (
                <label key={o.id}>
                  <input type="radio" name={s.id} checked={values[s.id] === o.id} onChange={() => setValues({ ...values, [s.id]: o.id })} /> {o.label}
                </label>
              ))}
            </div>
          ) : null}
          <label className="stack">
            <span className="small muted">{s.options.length ? "Or in your own words" : "Your answer"}</span>
            <textarea
              rows={2}
              maxLength={s.maxLength}
              value={s.options.some((o) => o.id === values[s.id]) ? "" : (values[s.id] ?? "")}
              onChange={(e) => setValues({ ...values, [s.id]: e.target.value })}
              aria-label={s.ask}
            />
          </label>
        </Card>
      ))}
      {error ? <Banner tone="warn">{error}</Banner> : null}
      <Button variant="primary" type="submit">Check my app</Button>
    </form>
  );
}

const answerOf = (s: FormStep, v: string): Answer => (s.options.some((o) => o.id === v.trim()) ? { step: s.id, choice: v.trim() } : { step: s.id, text: v.trim() });
