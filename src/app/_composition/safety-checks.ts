import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadApp } from "@/lib/app-config";
import { classify } from "@/features/gatekeeper/features/classifier/public-api/infrastructure";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { scoreSignals, screen } from "@/features/trust/public-api/infrastructure";

/**
 * The repository's own safety test sets, run in process for the dashboard. They are small, hand-written and synthetic, so a pass
 * means "none of these known attacks got through", not "the system is safe". The same sets and thresholds run in the test suite.
 */
export interface SafetyCheck {
  id: string;
  title: string;
  cases: number;
  failures: string[];
  /** What passing means, in words. */
  claim: string;
}

const SEV = { auto: 0, ask: 1, forbid: 2 } as const;
const RANK = { none: 0, watch: 1, high: 2 } as const;
const read = async <T,>(f: string): Promise<T> => JSON.parse(await readFile(join(process.cwd(), "evals", f), "utf8")) as T;

export async function runSafetyChecks(): Promise<SafetyCheck[]> {
  const apps = await Promise.all(["kids-gear", "garden-tools"].map(async (id) => ({ id, app: await loadApp(id) })));
  const out: SafetyCheck[] = [];

  for (const [id, title, file] of [
    ["injection", "Instructions hidden in messages", "injection.redteam.json"],
    ["pressure", "Pressure to pay or commit", "price-pressure.redteam.json"],
    ["scams", "Scam scripts", "scam-scripts.redteam.json"],
  ] as const) {
    const cases = await read<{ id: string; text: string; minOutcome: "ask" | "forbid" }[]>(file);
    const failures: string[] = [];
    for (const { id: appId, app } of apps) {
      const gk = createGatekeeper({ app });
      for (const c of cases) if (SEV[gk.evaluateIncoming({ familyId: "f1", text: c.text }).outcome] < SEV[c.minOutcome]) failures.push(`${appId}:${c.id}`);
    }
    out.push({ id, title, cases: cases.length * apps.length, failures, claim: "The agent never acts alone on these: each goes to its owner or is refused." });
  }

  const gold = await read<{ id: string; text: string; mustInclude: string[] }[]>("topic-classifier.golden.json");
  const kids = apps[0]!.app;
  out.push({
    id: "topics", title: "Spotting the topics that always need the owner", cases: gold.length,
    failures: gold.filter((g) => !g.mustInclude.every((t) => classify(kids.policies, g.text).topics.includes(t))).map((g) => g.id),
    claim: "Every labelled commitment, price, identity, place or shipping message is recognised.",
  });

  const t = await read<{ leaks: { id: string; text: string; mustFind: string }[]; benign: string[]; scams: { id: string; messages: { t: string }[]; minLevel: "watch" | "high" }[] }>("trust.cases.json");
  out.push({
    id: "leaks", title: "Contact details, addresses and payment requests in chat", cases: t.leaks.length,
    failures: t.leaks.filter((c) => !screen(c.text).kinds.includes(c.mustFind as never) || screen(c.text).decision === "allow").map((c) => c.id),
    claim: "Each is removed or blocked before the other owner sees it.",
  });
  out.push({
    id: "benign", title: "Normal conversation left alone", cases: t.benign.length,
    failures: t.benign.filter((x) => screen(x).decision !== "allow").map((x) => x.slice(0, 40)),
    claim: "Everyday messages are not removed or blocked.",
  });
  out.push({
    id: "scam-signals", title: "Scam patterns across a conversation", cases: t.scams.length,
    failures: t.scams
      .filter((c) => RANK[scoreSignals({ messages: c.messages.map((m) => ({ text: m.t, kinds: screen(m.t).kinds })) }).level] < RANK[c.minLevel])
      .map((c) => c.id),
    claim: "Each script is flagged at least at its expected level.",
  });
  return out;
}
