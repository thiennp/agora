import { PRICE_PER_MTOK } from "@/lib/meta/cost-meter";

/**
 * Back-of-envelope capacity model behind docs/SCALE.md. Every input is an explicit assumption, not a measurement; change
 * them and the tables change. `npm run capacity [-- 100000000]` prints the markdown tables used in the doc.
 */
export interface Assumptions {
  /** Deals a member takes part in per month (docs/ARCHITECTURE.md section 12b). */
  dealsPerMember: number;
  /** Model calls per deal (same source). */
  modelCallsPerDeal: number;
  /** Busiest second compared with the average second. */
  peakFactor: number;
  tokensIn: number;
  tokensOut: number;
  /** Share of calls that need the large model; the rest go to the cheap open model. */
  largeModelShare: number;
  /** Share of model calls avoided by deterministic code, templates and caches, on top of what is already avoided. */
  avoidedShare: number;
  /** API requests per member per month (cards, deal views, answers). */
  requestsPerMember: number;
  /** Stored bytes per deal: structured offers, relayed messages, audit entries. */
  bytesPerDeal: number;
  /** Items a member has listed at any time. */
  activeItemsPerMember: number;
  /** In-memory index bytes per listed item, from `npm run bench:matching` (350-390 MB per million items). */
  indexBytesPerItem: number;
  /** Working set one matching shard should hold, bytes. */
  shardBytes: number;
}

export const DEFAULTS: Assumptions = {
  dealsPerMember: 3,
  modelCallsPerDeal: 12,
  peakFactor: 10,
  tokensIn: 800,
  tokensOut: 200,
  largeModelShare: 0.2,
  avoidedShare: 0.7,
  requestsPerMember: 100,
  bytesPerDeal: 22_000,
  activeItemsPerMember: 2,
  indexBytesPerItem: 390,
  shardBytes: 8e9,
};

const MONTH_SECONDS = 30 * 24 * 3600;

export function costPerCallUsd(model: "muse-spark" | "muse-spark-open", a: Assumptions): number {
  const p = PRICE_PER_MTOK[model];
  return (a.tokensIn * p.input + a.tokensOut * p.output) / 1e6;
}

export function capacity(members: number, a: Assumptions = DEFAULTS) {
  const deals = members * a.dealsPerMember;
  const calls = deals * a.modelCallsPerDeal;
  const large = costPerCallUsd("muse-spark", a);
  const small = costPerCallUsd("muse-spark-open", a);
  const mixed = a.largeModelShare * large + (1 - a.largeModelShare) * small;
  const requests = members * a.requestsPerMember;
  const indexBytes = members * a.activeItemsPerMember * a.indexBytesPerItem;
  return {
    members,
    dealsPerMonth: deals,
    modelCallsPerMonth: calls,
    modelCallsPerSecAvg: calls / MONTH_SECONDS,
    modelCallsPerSecPeak: (calls / MONTH_SECONDS) * a.peakFactor,
    requestsPerSecAvg: requests / MONTH_SECONDS,
    requestsPerSecPeak: (requests / MONTH_SECONDS) * a.peakFactor,
    costAllLargeUsd: calls * large,
    costMixedUsd: calls * mixed,
    costMixedAvoidedUsd: calls * (1 - a.avoidedShare) * mixed,
    costPerMemberMixedAvoidedUsd: a.dealsPerMember * a.modelCallsPerDeal * (1 - a.avoidedShare) * mixed,
    storageBytesPerMonth: deals * a.bytesPerDeal,
    indexBytes,
    matchingShards: Math.ceil(indexBytes / a.shardBytes),
  };
}

const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const usd = (n: number) => (n >= 1e6 ? `$${fmt(n / 1e6, 1)}M` : n >= 1e3 ? `$${fmt(n / 1e3)}k` : `$${fmt(n, 2)}`);
const bytes = (n: number) => (n >= 1e12 ? `${fmt(n / 1e12, 1)} TB` : n >= 1e9 ? `${fmt(n / 1e9, 1)} GB` : `${fmt(n / 1e6)} MB`);

export function markdownTables(sizes: number[], a: Assumptions = DEFAULTS): string {
  const rows = sizes.map((m) => capacity(m, a));
  const head = (cols: string[]) => `| Members | ${cols.join(" | ")} |\n|---|${cols.map(() => "---:").join("|")}|`;
  const members = (m: number) => fmt(m);
  return [
    "Traffic",
    head(["Deals / month", "Model calls / month", "Model calls / s (avg → peak)", "API requests / s (avg → peak)"]),
    ...rows.map((r) => `| ${members(r.members)} | ${fmt(r.dealsPerMonth)} | ${fmt(r.modelCallsPerMonth)} | ${fmt(r.modelCallsPerSecAvg)} → ${fmt(r.modelCallsPerSecPeak)} | ${fmt(r.requestsPerSecAvg)} → ${fmt(r.requestsPerSecPeak)} |`),
    "",
    "Model spend per month (placeholder prices from src/lib/meta/cost-meter.ts)",
    head(["All on the large model", "20% large / 80% open", "…and 70% fewer calls", "Per member per month"]),
    ...rows.map((r) => `| ${members(r.members)} | ${usd(r.costAllLargeUsd)} | ${usd(r.costMixedUsd)} | ${usd(r.costMixedAvoidedUsd)} | $${r.costPerMemberMixedAvoidedUsd.toFixed(4)} |`),
    "",
    "Storage and matching memory",
    head(["New stored data / month", "Matching index in memory", `Matching shards (${bytes(a.shardBytes)} each)`]),
    ...rows.map((r) => `| ${members(r.members)} | ${bytes(r.storageBytesPerMonth)} | ${bytes(r.indexBytes)} | ${fmt(r.matchingShards)} |`),
  ].join("\n");
}

if (process.argv[1]?.endsWith("capacity-model.ts")) {
  const only = Number(process.argv[2]);
  console.log(markdownTables(only ? [only] : [1e6, 1e7, 1e8, 1e9]));
}
