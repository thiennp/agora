import { mkdirSync, writeFileSync } from "node:fs";
import { runBenchmarkSeeds, toCsv } from "@/features/simulation/public-api/infrastructure";

/**
 * `npm run simulate [-- --rounds 8 --seeds 5 --app kids-gear --out reports/simulation]`
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
const seeds = Array.from({ length: nSeeds }, (_, i) => 20261027 + i);

async function main() {
const run = await runBenchmarkSeeds({ appId: app, rounds, seeds, trainEpisodes: 2, evalEpisodes: 3 });
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
  ["simulated,round,approval_on_mean,approval_on_min,approval_on_max,approval_off_mean,approval_off_min,approval_off_max,confirmed_per_100_on,confirmed_per_100_off", ...run.rows.map((r) => ["true", r.round, cell(r.approvalOnMean), cell(r.approvalOnMin), cell(r.approvalOnMax), cell(r.approvalOffMean), cell(r.approvalOffMin), cell(r.approvalOffMax), cell(r.confirmedPer100OnMean), cell(r.confirmedPer100OffMean)].join(","))].join("\n") + "\n",
);

console.log(run.label);
console.log(`app ${app}, ${seeds.length} seeds, held-out episodes only\n`);
console.log("round | approval ON (min-max) | approval OFF (min-max) | confirmed/100 wants ON | OFF");
for (const r of run.rows) {
  console.log(`${String(r.round).padStart(5)} | ${r.approvalOnMean} (${r.approvalOnMin}-${r.approvalOnMax}) | ${r.approvalOffMean} (${r.approvalOffMin}-${r.approvalOffMax}) | ${r.confirmedPer100OnMean} | ${r.confirmedPer100OffMean}`);
}
console.log("\nfailures (seed " + seeds[0] + ", all kept in the CSV, sampled in the report):", first.failureCounts);
for (const n of first.notes) console.log("note:", n);
console.log(`\nwritten to ${out}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
