import { runBenchmarkSeeds, writeSimulationFiles } from "@/features/simulation/public-api/infrastructure";

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
const first = run.reports[0]!;
writeSimulationFiles(run, out);

console.log(run.label);
console.log(`app ${app}, ${seeds.length} seeds, held-out episodes only (mean over seeds)\n`);
console.log("confirmed deals per 100 wants (higher is better)");
console.log("round | OFF    tighten  ON     OFF+retry ON+retry ORDERED wide   open   | ORACLE ceiling");
for (const r of run.rows) {
  console.log(`${String(r.round).padStart(5)} | ${r.confirmedPer100OffMean}  ${r.confirmedPer100TightenOnlyMean}  ${r.confirmedPer100OnMean}  ${r.confirmedPer100OffRetryMean}  ${r.confirmedPer100OnRetryMean}  ${r.confirmedPer100OrderedMean}  ${r.confirmedPer100OrderedWideMean}  ${r.confirmedPer100OrderedOpenMean} | ${r.confirmedPer100OracleMean}`);
}
const h = run.headroom;
console.log(`\nover rounds ${h.rounds.join(",")}: confirmed per 100 wants: off ${h.off}, tighten-only ${h.tightenOnly}, on ${h.on}, off+retry ${h.offRetry}, on+retry ${h.onRetry}, ordered ${h.ordered}, ordered-wide ${h.orderedWide}, ordered-open ${h.orderedOpen}, oracle ${h.oracle}`);
console.log(`owner cards (confirm, scheduling, stretch) per confirmed deal: off ${h.cardsPerConfirmed.off}, tighten-only ${h.cardsPerConfirmed.tightenOnly}, on ${h.cardsPerConfirmed.on}, off+retry ${h.cardsPerConfirmed.offRetry}, on+retry ${h.cardsPerConfirmed.onRetry}, ordered ${h.cardsPerConfirmed.ordered}, ordered-wide ${h.cardsPerConfirmed.orderedWide}, ordered-open ${h.cardsPerConfirmed.orderedOpen}`);
console.log(`retry alone closes ${h.retryAloneClosesGapPct}% of the gap between no learning and the oracle; retry on top of learning closes ${h.retryClosesGapPct}% of the gap between learning-on and the oracle`);
console.log(`ordering wins back ${h.orderedRecoversPct}% (with margin) and ${h.orderedWideRecoversPct}% (no margin) and ${h.orderedOpenRecoversPct}% (no margin, no back-off) of the coverage that learning+retry loses against retry alone`);
console.log("\nfailures (seed " + seeds[0] + ", all kept in the CSV, sampled in the report):", first.failureCounts);
for (const n of first.notes) console.log("note:", n);
console.log(`\nwritten to ${out}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
