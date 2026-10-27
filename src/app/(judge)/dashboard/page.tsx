import Link from "next/link";
import { Badge } from "@/components/Badge";
import { BarList } from "@/components/BarList";
import { Banner, Card } from "@/components/Card";
import { LineChart } from "@/components/LineChart";
import { RerunButton } from "@/components/RerunButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getPlatform } from "@/app/_composition/platform";
import { loadDashboard, type Scenario } from "@/app/_composition/reports";

export const dynamic = "force-dynamic";

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "–" : `${Math.round(n * 100)}%`);
const num = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? "–" : n.toFixed(d));
const col = (rows: Record<string, number | null>[], k: string) => rows.map((r) => r[k] ?? null);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const scenario: Scenario = (await searchParams).scenario === "drift" ? "drift" : "stable";
  const d = await loadDashboard(scenario);
  const xs = d.rows.map((r) => r.round as number);
  const last = d.rows.at(-1)!;
  const h = d.headroom;
  const cards = h.cardsPerConfirmed;
  const drift = d.config.drift;

  let live: { feed: { at: string; text: string }[]; audit: Awaited<ReturnType<typeof getPlatform>>["audit"] } | null = null;
  try {
    const p = await getPlatform();
    live = { feed: p.feed.slice(0, 8), audit: p.audit };
  } catch {
    live = null;
  }

  const failures = Object.entries(d.failureCounts).map(([k, n]) => {
    const [arm, kind, ...reason] = k.split(":");
    return { arm: arm!, kind: kind!.replace(/_/g, " "), reason: reason.join(":").replace(/_/g, " "), n };
  });
  const kinds = [...new Set(failures.map((f) => `${f.kind}${f.reason ? ` · ${f.reason}` : ""}`))];
  const count = (arm: string, label: string) => failures.find((f) => f.arm === arm && `${f.kind}${f.reason ? ` · ${f.reason}` : ""}` === label)?.n ?? 0;

  return (
    <div className="stack-lg">
      <AutoRefresh seconds={8} />
      <div>
        <h1>Judge dashboard</h1>
        <Banner tone="warn"><strong>SIMULATED.</strong> {d.label.replace(/^SIMULATED: /, "")} Numbers are means over {d.seeds.length} seeds, measured on held-out scenarios only; the hidden owner rules are stand-ins for real preferences.</Banner>
      </div>

      <div className="row between">
        <nav className="pill-nav" aria-label="Scenario">
          <Link href="/dashboard?scenario=stable" aria-current={scenario === "stable" ? "true" : undefined}>Stable preferences</Link>
          <Link href="/dashboard?scenario=drift" aria-current={scenario === "drift" ? "true" : undefined}>Preferences change in round 5</Link>
        </nav>
        <RerunButton scenario={scenario} />
      </div>

      <div className="grid grid-kpi">
        <Card as="div"><div className="kpi"><div className="label">Owner approval, round {last.round}</div><div className="value">{pct(last.approval_on_mean)}</div><div className="sub muted">{pct(last.approval_off_mean)} without learning</div></div></Card>
        <Card as="div"><div className="kpi"><div className="label">Confirmed deals per 100 wants</div><div className="value">{num(h.on)}</div><div className="sub muted">{num(h.off)} without learning · {num(h.oracle)} ceiling</div></div></Card>
        <Card as="div"><div className="kpi"><div className="label">Cards an owner answers per confirmed deal</div><div className="value">{num(cards.on)}</div><div className="sub muted">{num(cards.off)} without learning</div></div></Card>
        <Card as="div"><div className="kpi"><div className="label">Unauthorized commitments</div><div className="value">{d.unauthorizedCommitments}</div><div className="sub muted">across every arm and round</div></div></Card>
      </div>

      <Card title="Does the agent get better at what the owner wants?">
        <p className="muted">Share of owner decisions that were a yes, in each round. Round 1 is measured before anything is learned. The band is the lowest to highest of {d.seeds.length} seeds.</p>
        <LineChart
          title="Owner approval rate by round"
          summary={`With learning, approval rises from ${pct(d.rows[0]!.approval_on_mean)} in round 1 to ${pct(last.approval_on_mean)} in round ${last.round}; without learning it stays near ${pct(last.approval_off_mean)}.`}
          xs={xs}
          yMax={1}
          yTicks={5}
          format={(n) => `${Math.round(n * 100)}%`}
          markAfter={drift ? { x: drift.fromRound - 1, label: "preferences change" } : undefined}
          series={[
            { key: "off", label: "No learning", color: "var(--c-off)", values: col(d.rows, "approval_off_mean"), band: { min: col(d.rows, "approval_off_min"), max: col(d.rows, "approval_off_max") } },
            { key: "on", label: "Learning", color: "var(--c-learning)", values: col(d.rows, "approval_on_mean"), band: { min: col(d.rows, "approval_on_min"), max: col(d.rows, "approval_on_max") } },
          ]}
        />
      </Card>

      <Card title="And does it still get people what they need?">
        <p className="muted">Deals both owners confirmed, per 100 wants. Approval alone can rise by proposing fewer deals, so this is the check. Offering the next-best match after a decline recovers most of the gap to the ceiling (dashed), at a cost in owner attention (below).</p>
        <LineChart
          title="Confirmed deals per 100 wants by round"
          summary={`Averages after the first round: no learning ${num(h.off)}, learning ${num(h.on)}, no learning with retry ${num(h.offRetry)}, learning with retry ${num(h.onRetry)}, ceiling ${num(h.oracle)}.`}
          xs={xs}
          yMax={Math.ceil(Math.max(...col(d.rows, "confirmed_per_100_oracle_ceiling").map((v) => v ?? 0)) / 10) * 10}
          yTicks={4}
          format={(n) => String(Math.round(n))}
          markAfter={drift ? { x: drift.fromRound - 1, label: "preferences change" } : undefined}
          series={[
            { key: "off", label: "No learning", color: "var(--c-off)", values: col(d.rows, "confirmed_per_100_off") },
            { key: "on", label: "Learning", color: "var(--c-learning)", values: col(d.rows, "confirmed_per_100_on") },
            { key: "offr", label: "No learning + retry", color: "var(--c-retry)", values: col(d.rows, "confirmed_per_100_off_retry") },
            { key: "onr", label: "Learning + retry", color: "var(--c-both)", values: col(d.rows, "confirmed_per_100_on_retry") },
            { key: "or", label: "Ceiling (knows the hidden rules)", color: "var(--c-oracle)", dashed: true, values: col(d.rows, "confirmed_per_100_oracle_ceiling") },
          ]}
        />
      </Card>

      <Card title="What a deal costs the owner's attention">
        <p className="muted">Every card an owner answers (confirm or decline, scheduling questions, stretch cards) per confirmed deal, averaged over rounds {h.rounds[0]} to {h.rounds.at(-1)}. Lower is better.</p>
        <BarList
          unit=" cards"
          bars={[
            { label: "No learning", value: cards.off, color: "var(--c-off)" },
            { label: "Learning", value: cards.on, color: "var(--c-learning)" },
            { label: "No learning + retry", value: cards.offRetry, color: "var(--c-retry)" },
            { label: "Learning + retry", value: cards.onRetry, color: "var(--c-both)" },
          ]}
        />
        <ul style={{ marginTop: 12 }}>
          <li>Learning lifts approval from {pct(d.rows[0]!.approval_off_mean)} to {pct(last.approval_on_mean)} and cuts the cards per confirmed deal from {num(cards.off)} to {num(cards.on)}.</li>
          <li>Offering the next-best match recovers about {num(h.retryAloneClosesGapPct, 0)}% of the gap to the ceiling, but costs {num(cards.offRetry)} cards per deal without learning.</li>
          <li>Learning plus retry keeps most of that coverage ({num(h.onRetry)} against {num(h.offRetry)} deals per 100 wants) at {num(cards.onRetry)} cards per deal.</li>
        </ul>
      </Card>

      <div className="grid grid-2">
        <Card title="Failures are kept, not hidden">
          <p className="muted small">How often a want ended without a deal, in the first seed ({d.seeds[0]}).</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>What happened</th><th className="num">No learning</th><th className="num">Learning</th></tr></thead>
              <tbody>
                {kinds.map((k) => <tr key={k}><td>{k}</td><td className="num">{count("learning_off", k)}</td><td className="num">{count("learning_on", k)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Not measured, and why">
          <ul className="list">
            <li><Badge tone="warn">Cost per deal</Badge> <span className="small">Not measured: the simulation uses template notes and no live model.</span></li>
            <li><Badge tone="warn">Model choices</Badge> <span className="small">Spark Open versus Spark API is not compared: it needs live model calls.</span></li>
            <li><Badge tone="info">Privacy leaks</Badge> <span className="small">Covered by the screening tests, not by this simulation.</span></li>
            <li><Badge tone="info">Real people</Badge> <span className="small">Hidden rules and the preference change are stand-ins.</span></li>
          </ul>
        </Card>
      </div>

      <Card title="Live demo activity" id="live">
        {live ? (
          <div className="grid grid-2">
            <div>
              <h3>What just happened</h3>
              {live.feed.length === 0 ? <p className="muted">Nothing yet. <Link href="/cards?as=a">Try the demo.</Link></p> : (
                <ul className="list">{live.feed.map((f, i) => <li key={i} className="small">{f.text} <span className="muted">· {new Date(f.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></li>)}</ul>
              )}
              <p style={{ marginTop: 12 }}><Link className="btn primary" href="/cards?as=a">Try it as an owner</Link></p>
            </div>
            <div>
              <h3>Privacy and safety, counted live</h3>
              <ul className="list small">
                <li>Agent decisions: {live.audit.gatekeeper.auto ?? 0} handled alone, {live.audit.gatekeeper.ask ?? 0} sent to an owner, {live.audit.gatekeeper.forbid ?? 0} refused</li>
                <li>Messages: {live.audit.screening.allow ?? 0} clean, {live.audit.screening.redact ?? 0} with details removed, {live.audit.screening.block ?? 0} blocked</li>
                <li>Owner cards: {live.audit.cards.question_answered ?? 0} questions answered, {live.audit.cards.confirmation_decided ?? 0} confirmations decided</li>
              </ul>
              <p className="muted small">Counts only: nothing here records message text.</p>
            </div>
          </div>
        ) : <p className="muted">The live demo is not available in this mode.</p>}
      </Card>

      <details>
        <summary>Notes from the simulation</summary>
        <ul>{d.notes.map((n) => <li key={n} className="small">{n}</li>)}</ul>
      </details>
    </div>
  );
}
