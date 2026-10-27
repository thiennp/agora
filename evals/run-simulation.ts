import { mkdirSync, writeFileSync } from "node:fs";
import { runBenchmarkSeeds, toCsv } from "@/features/simulation/public-api/infrastructure";

/**
 * `npm run simulate [-- --rounds 8 --seeds 5 --app kids-gear --out reports/simulation --drift 5]`
 * `--drift 5` makes half the families tolerate twice the distance from round 5, to test whether learned limits recover.
 * Runs the sandbox city with learning on and off over several seeds and writes held-out results as CSV and JSON.
 * Everything here is simulated and labelled as such.
 */
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};

const rounds = Number(arg("rounds", "8"));
const nSeeds = Number(arg("seeds", "5"));
const app = arg("app", "kids-gear");
const out = arg("out", "reports/simulation");
const driftFrom = Number(arg("drift", "0"));
const seeds = Array.from({ length: nSeeds }, (_, i) => 20261027 + i);

async function main() {
const run = await runBenchmarkSeeds({ appId: app, rounds, seeds, trainEpisodes: 2, evalEpisodes: 3, drift: driftFrom > 0 ? { fromRound: driftFrom, factor: 2 } : undefined });
mkdirSync(out, { recursive: true });
const first = run.reports[0]!;
const csv = toCsv(first);
writeFileSync(`${out}/per_round_seed${seeds[0]}.csv`, csv.perRound);
writeFileSync(`${out}/comparison_seed${seeds[0]}.csv`, csv.comparison);
writeFileSync(`${out}/failures_seed${seeds[0]}.csv`, csv.failures);
writeFileSync(`${out}/summary.json`, JSON.stringify({ simulated: true, label: run.label, seeds, rows: run.rows, notes: first.notes, failureCounts: first.failureCounts }, null, 2));
const cell = (v: number | null) => (v === null ? "" : v);
writeFileSync(
  `${out}/summary.csv`,
  [
    "simulated,round,approval_on_mean,approval_on_min,approval_on_max,approval_tighten_only_mean,approval_off_mean,approval_off_min,approval_off_max,confirmed_per_100_on,confirmed_per_100_tighten_only,confirmed_per_100_off,confirmed_per_100_oracle_ceiling,stretch_offers_on,stretch_accepted_on,stretch_confirmed_on,interruptions_per_deal_on,interruptions_per_deal_tighten_only",
    ...run.rows.map((r) => ["true", r.round, cell(r.approvalOnMean), cell(r.approvalOnMin), cell(r.approvalOnMax), cell(r.approvalTightenOnlyMean), cell(r.approvalOffMean), cell(r.approvalOffMin), cell(r.approvalOffMax), cell(r.confirmedPer100OnMean), cell(r.confirmedPer100TightenOnlyMean), cell(r.confirmedPer100OffMean), cell(r.confirmedPer100OracleMean), cell(r.stretchOffersOnMean), cell(r.stretchAcceptedOnMean), cell(r.stretchConfirmedOnMean), cell(r.interruptionsOnMean), cell(r.interruptionsTightenOnlyMean)].join(",")),
  ].join("\n") + "\n",
);

console.log(run.label);
console.log(`app ${app}, ${seeds.length} seeds, held-out episodes only (mean over seeds)\n`);
console.log("      approval rate                  | confirmed deals per 100 wants          | stretch cards (ON)  | owner questions per deal");
console.log("round | ON (min-max)     tight   OFF   | ON     tight   OFF    ORACLE ceiling | shown  ok  confirmed | ON     tighten-only");
for (const r of run.rows) {
  console.log(`${String(r.round).padStart(5)} | ${r.approvalOnMean} (${r.approvalOnMin}-${r.approvalOnMax})  ${r.approvalTightenOnlyMean}  ${r.approvalOffMean}  | ${r.confirmedPer100OnMean}  ${r.confirmedPer100TightenOnlyMean}  ${r.confirmedPer100OffMean}  ${r.confirmedPer100OracleMean}  | ${r.stretchOffersOnMean}  ${r.stretchAcceptedOnMean}  ${r.stretchConfirmedOnMean}  | ${r.interruptionsOnMean}  ${r.interruptionsTightenOnlyMean}`);
}
console.log("\nfailures (seed " + seeds[0] + ", all kept in the CSV, sampled in the report):", first.failureCounts);
for (const n of first.notes) console.log("note:", n);
console.log(`\nwritten to ${out}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
