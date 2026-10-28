import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmCard } from "@/components/ConfirmCard";
import { OwnerShell } from "@/components/OwnerShell";
import { QuestionCard } from "@/components/QuestionCard";
import { Unavailable } from "@/components/Unavailable";
import { ownerView } from "@/app/_composition/views";
import type { Platform } from "@/app/_composition/platform";
import type { Scope } from "@/components/scope";

/** The owner cards of one person: the demo's (`/cards`) and a created app's (`/app/{app}/cards`) are this one body. The person's own tap answers them in both. */
export async function CardsBody({ platform, scope }: { platform: Platform; scope: Scope }) {
  const as = scope.as;
  let v;
  try {
    v = await ownerView(platform, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  const learn = `/api/owner/learning`;
  return (
    <OwnerShell name={v.persona.name} language={v.persona.language} pending={v.pending} scope={scope}>
      <section aria-labelledby="q" className="stack">
        <h2 id="q">Questions from your agent</h2>
        {v.questions.length === 0 ? <p className="muted">No questions. Your agent only asks when it cannot decide alone.</p> : null}
        {v.questions.map((q) => <QuestionCard key={q.id} id={q.id} as={as} text={q.text} answers={q.answers} canRemember={q.canRemember} language={q.language} />)}
      </section>

      <section aria-labelledby="c" className="stack">
        <h2 id="c">Confirm or decline</h2>
        {v.confirmations.length === 0 ? <p className="muted">Nothing to confirm yet. A confirm card appears when the two agents agree.</p> : null}
        {v.confirmations.map((c) => <ConfirmCard key={c.id} id={c.id} dealId={c.dealId} as={as} item={c.item} role={c.role} />)}
      </section>

      {v.proposals.length + v.stretch.length > 0 ? (
        <section aria-labelledby="s" className="stack">
          <h2 id="s">Your agent suggests</h2>
          {v.proposals.map((p) => (
            <Card key={p.id}>
              <p>{p.text}</p>
              <div className="row">
                <ActionButton url={learn} body={{ as, action: "proposal", id: p.id, accept: true }} variant="primary">Yes, make it a rule</ActionButton>
                <ActionButton url={learn} body={{ as, action: "proposal", id: p.id, accept: false }}>No thanks</ActionButton>
              </div>
            </Card>
          ))}
          {v.stretch.map((o) => (
            <Card key={o.id}>
              <p>{o.text}</p>
              <div className="row">
                <ActionButton url={learn} body={{ as, action: "stretch", id: o.id, answer: "yes" }} variant="primary">Look at it</ActionButton>
                <ActionButton url={learn} body={{ as, action: "stretch", id: o.id, answer: "no" }}>No</ActionButton>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="l" className="stack">
        <h2 id="l">What I learned about you</h2>
        {v.lessons.length === 0 ? <p className="muted">Nothing yet. When you decline a deal and say why, your agent remembers it here, and you can delete it.</p> : null}
        <ul className="list">
          {v.lessons.map((l) => (
            <li key={l.id}>
              <div className="row between">
                <span>{l.text}</span>
                <span className="row">
                  <Badge tone={l.level === "tentative" ? "neutral" : "accent"}>{l.level} · seen {l.seenTimes}×</Badge>
                  <ActionButton url={learn} body={{ as, action: "forget", id: l.id }} variant="ghost">Forget</ActionButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <h3>Standing rules</h3>
        {v.rules.length === 0 ? <p className="muted">None. A rule lets your agent handle one kind of low-risk question alone; money, commitments, places and personal details always ask you.</p> : null}
        <ul className="list">
          {v.rules.map((r) => (
            <li key={r.id}>
              <div className="row between">
                <span>Answer questions about <strong>{r.topic}</strong> for me · until {new Date(r.expiresAt).toLocaleDateString()}</span>
                <ActionButton url={learn} body={{ as, action: "revoke", id: r.id }} variant="ghost">Turn off</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </OwnerShell>
  );
}
