import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Banner, Card } from "@/components/Card";
import { ChatBox } from "@/components/ChatBox";
import { HandoffPanel } from "@/components/HandoffPanel";
import { OwnerShell } from "@/components/OwnerShell";
import { ReportForm } from "@/components/ReportForm";
import { Unavailable } from "@/components/Unavailable";
import { getPlatform } from "@/app/_composition/platform";
import { asKey, dealView, ownerView } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const windowText = (w: { from: string; to: string } | null) => (w ? `${new Date(w.from).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} to ${when(w.to)}` : null);

export default async function DealRoom({ params, searchParams }: { params: Promise<{ dealId: string }>; searchParams: Promise<{ as?: string }> }) {
  const { dealId } = await params;
  const as = asKey((await searchParams).as);
  let view, owner;
  try {
    const p = await getPlatform();
    view = await dealView(p, dealId, as);
    owner = await ownerView(p, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  if (!view) notFound();
  const closed = ["declined", "expired", "reported", "completed", "not_completed"].includes(view.deal.state);

  return (
    <OwnerShell name={owner.persona.name} language={owner.persona.language} pending={owner.pending} as={as}>
      <Card prominent>
        <div className="row between">
          <h2 style={{ margin: 0 }}>{view.item}</h2>
          <Badge tone={view.deal.state === "reported" || view.deal.state === "declined" ? "bad" : "accent"}>{view.deal.state.replace(/_/g, " ")}</Badge>
        </div>
        <p>{view.summary}</p>
        <p className="muted small">You are {view.deal.role} this item · negotiation round {view.deal.round} of {view.deal.maxRounds}</p>
        {view.deal.flags.length ? <Banner tone="warn">Your agent set aside something the other side sent: {view.deal.flags.map((f) => (f === "untrusted_instruction" ? "an instruction it will not follow" : f.startsWith("note_dropped") ? "a note asking for something" : f)).join("; ")}.</Banner> : null}
      </Card>

      <div className="grid grid-2">
        <Card title="Conversation">
          <Banner tone="info">
            <span className="small">You never write to the other family directly. Your agent removes contact details, blocks addresses and payment requests, translates, and delivers. Translation here is <strong>simulated</strong> (no model key).</span>
          </Banner>
          <div className="bubbles" style={{ marginTop: 12 }} aria-live="polite">
            {view.conversation.length === 0 ? <p className="muted">No messages yet.</p> : null}
            {view.conversation.map((m) =>
              m.direction === "sent" ? (
                <div key={m.id} className="bubble me">
                  <div lang={view.persona.language}>{m.original}</div>
                  <div className="meta">
                    <Badge tone={m.status === "blocked" ? "bad" : m.status === "redacted" ? "warn" : "accent"}>{m.status === "blocked" ? "Not sent" : m.status === "redacted" ? "Sent with details removed" : "Delivered"}</Badge>
                  </div>
                  {m.notice ? <div className="small" style={{ marginTop: 4 }}>{m.notice}</div> : null}
                  {m.status !== "blocked" && m.deliveredAs && m.deliveredAs !== m.original ? <div className="orig">They read: <span lang={view.other.language}>{m.deliveredAs}</span></div> : null}
                </div>
              ) : (
                <div key={m.id} className="bubble">
                  <div lang={m.textLang}>{m.text}</div>
                  <div className="meta">
                    {m.translationFailed ? <Badge tone="warn">Not translated</Badge> : m.textLang !== m.originalLang ? <Badge tone="info">Translated · simulated</Badge> : null}
                    {m.uncertain ? <Badge tone="warn">Translation uncertain</Badge> : null}
                  </div>
                  {m.textLang !== m.originalLang && !m.translationFailed ? <div className="orig">Original ({m.originalLang.toUpperCase()}, details removed): <span lang={m.originalLang}>{m.originalFromSender}</span></div> : null}
                  {m.notice ? <div className="small" style={{ marginTop: 4 }}><Badge tone="warn">Note</Badge> {m.notice}</div> : null}
                </div>
              ),
            )}
          </div>
          {!closed || view.deal.state === "completed" ? (
            <div style={{ marginTop: 12 }}><ChatBox dealId={dealId} as={as} /></div>
          ) : <p className="muted small" style={{ marginTop: 12 }}>This deal is closed, so chat is closed.</p>}
        </Card>

        <div className="stack">
          <Card title="How the item changes hands">
            <HandoffPanel dealId={dealId} as={as} card={view.handoff as never} role={view.deal.role} dropPoints={view.dropPoints} modes={view.modes} />
          </Card>
          <Card title="What the agents did">
            <ol className="timeline">
              {view.history.map((h, i) => <li key={i}>{h.text} <span className="muted small">· {when(h.at)}</span></li>)}
            </ol>
            {view.offers.length ? (
              <details style={{ marginTop: 12 }}>
                <summary>The agents&apos; offers</summary>
                <ul className="list" style={{ marginTop: 8 }}>
                  {view.offers.map((o, i) => (
                    <li key={i}>
                      <div className="small"><strong>{o.fromMe ? "Your agent" : "The other agent"}</strong> · round {o.round} · terms: {o.terms}{windowText(o.window) ? ` · pickup ${windowText(o.window)}` : ""}</div>
                      {o.note ? <div className="small" lang={o.noteLang}>{o.translated ?? o.note}{o.translated ? <span className="muted"> (original: {o.note})</span> : null}</div> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Card>
          <Card title="Safety">
            {view.signals.signals.length === 0 ? <p className="muted">No warning signs in this conversation.</p> : (
              <ul className="list">{view.signals.signals.map((s) => <li key={s.id}><Badge tone="warn">{view.signals.level}</Badge> {s.explanation}</li>)}</ul>
            )}
            {view.deal.state !== "reported" ? <ReportForm dealId={dealId} as={as} /> : <p className="muted">This deal was reported and has stopped.</p>}
          </Card>
        </div>
      </div>
    </OwnerShell>
  );
}
