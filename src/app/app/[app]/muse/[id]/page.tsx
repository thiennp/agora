import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { BarList } from "@/components/BarList";
import { Banner, Card } from "@/components/Card";
import { LineChart } from "@/components/LineChart";
import { memberStatusView } from "@/app/_composition/member-status";

export const dynamic = "force-dynamic";

const colors = ["var(--c-learning)", "var(--c-both)", "var(--c-retry)", "var(--c-off)"];
const bars = (xs: { label: string; value: number }[]) => xs.map((x, i) => ({ ...x, color: colors[i % colors.length]! }));

/**
 * `/app/{app}/muse/{id}` (served at `/agora/app/{app}/muse/{id}`), docs/PLAN.md §2c step 5, BR-43. One member's agent in one app,
 * grouped. Read-only: answering cards is a separate step. Anyone but that member gets the not-found page (see `memberStatusView`).
 */
export default async function MemberStatusPage({ params }: { params: Promise<{ app: string; id: string }> }) {
  const { app, id } = await params;
  const v = await memberStatusView(app, id, (await cookies()).toString());
  if (v.kind === "denied") notFound();
  const s = v.status;
  const waiting = s.waiting.questions.length + s.waiting.confirmations.length + s.waiting.offers.length;
  const total = s.deals.length + s.items.length;

  return (
    <div className="stack-lg">
      <div>
        <p className="small muted">Your agent in <Link href={`/app/${s.app.id}`}>{s.app.name}</Link></p>
        <h1>{s.member.name ? `${s.member.name}'s agent` : "Your agent"}</h1>
        <p className="small muted">This page is private to you. It shows decisions and counts, never the messages between agents.</p>
      </div>

      {total === 0 && waiting === 0 ? <Banner tone="info">Nothing yet. When you add what you offer or need, your agent starts working and everything it does shows up here.</Banner> : null}

      <Card title={<>Waiting on you <Badge tone={waiting ? "warn" : "neutral"}>{waiting}</Badge></>} prominent={waiting > 0}>
        {waiting === 0 ? <p className="muted">Nothing needs you. Your agent only stops to ask when it cannot decide alone.</p> : null}
        <ul className="list">
          {s.waiting.questions.map((q) => <li key={q.id}>{q.text}</li>)}
          {s.waiting.confirmations.map((c) => <li key={c.id}>Confirm or decline: {c.item} <span className="small muted">· you are {c.role}</span></li>)}
          {s.waiting.offers.map((o) => <li key={o.id}>{o.text}</li>)}
        </ul>
      </Card>

      <Card title={<>Deals <Badge>{s.deals.length}</Badge></>}>
        {s.deals.length === 0 ? <p className="muted">No deals yet.</p> : (
          <>
            <BarList bars={bars(s.dealsByState)} />
            <ul className="list">
              {s.deals.map((d) => (
                <li key={d.id}>{d.item} <span className="small muted">· you are {d.role}</span> <Badge tone={d.open ? "info" : "neutral"}>{d.stateLabel}</Badge></li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card title={<>Items <Badge>{s.items.length}</Badge></>}>
        {s.items.length === 0 ? <p className="muted">You have not listed anything yet.</p> : (
          <>
            <BarList bars={bars(s.itemsByStatus)} />
            <ul className="list">
              {s.items.map((i) => <li key={i.id}>{i.text} <span className="small muted">· {i.kind === "offer" ? "you offer" : "you need"}</span> <Badge>{i.status.replace(/_/g, " ")}</Badge></li>)}
            </ul>
          </>
        )}
      </Card>

      <Card title="What your agent did alone">
        <p>
          <strong>{s.alone.dealsRunning}</strong> deals in progress · <strong>{s.alone.roundsHandled}</strong> negotiation rounds handled · <strong>{s.alone.agreedWithoutYou}</strong> agreed with the other agent. It asked you before every commitment, price, place or personal detail.
        </p>
        <LineChart
          title="Agent activity, last 7 days"
          summary={`Steps your agent took on your deals per day: ${s.activity.counts.join(", ")}.`}
          xs={s.activity.days.map((_, i) => i)}
          series={[{ key: "steps", label: "Steps per day", color: "var(--c-learning)", values: s.activity.counts }]}
          yMax={Math.ceil(Math.max(...s.activity.counts, 4) / 4) * 4}
          yTicks={4}
          format={(n) => String(Math.round(n))}
          xLabel="Day"
        />
        {s.missing.map((m) => <p className="small muted" key={m}>{m}</p>)}
      </Card>

      <Card title={<>What your agent learned <Badge>{s.lessons.length}</Badge></>}>
        {s.lessons.length === 0 ? <p className="muted">Nothing yet. When you decline a deal and say why, your agent remembers it here.</p> : (
          <ul className="list">{s.lessons.map((l) => <li key={l.id}>{l.text} <span className="small muted">· seen {l.seenTimes}×, {l.level}</span></li>)}</ul>
        )}
      </Card>

      <Card title={<>Standing rules <Badge>{s.rules.length}</Badge></>}>
        {s.rules.length === 0 ? <p className="muted">None. Your agent asks every time. You can let it decide small things like a pickup time on its own.</p> : (
          <ul className="list">{s.rules.map((r) => <li key={r.id}>Decides {r.topic} on its own{r.expiresAt ? <span className="small muted"> · until {r.expiresAt.slice(0, 10)}</span> : null}</li>)}</ul>
        )}
      </Card>
    </div>
  );
}
