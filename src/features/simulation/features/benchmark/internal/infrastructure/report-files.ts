import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "./report-csv";
import type { BenchmarkReport, Headroom, runBenchmarkSeeds } from "./run-benchmark";

type SeedRun = Awaited<ReturnType<typeof runBenchmarkSeeds>>;

const cell = (v: number | null) => (v === null ? "" : v);

const SUMMARY_COLUMNS = [
  "simulated", "round", "approval_on_mean", "approval_on_min", "approval_on_max", "approval_tighten_only_mean", "approval_off_mean", "approval_off_min",
  "approval_off_max", "approval_on_retry_mean", "confirmed_per_100_on", "confirmed_per_100_tighten_only", "confirmed_per_100_off", "confirmed_per_100_on_retry",
  "confirmed_per_100_off_retry", "confirmed_per_100_ordered_open", "confirmed_per_100_oracle_ceiling", "owner_cards_per_100_on", "owner_cards_per_100_on_retry",
  "stretch_offers_on", "stretch_accepted_on", "stretch_confirmed_on", "interruptions_per_deal_on", "interruptions_per_deal_tighten_only",
] as const;

/** Write a multi-seed run as CSV and JSON files (summary, headroom, and the first seed's per-round, comparison and failure CSVs). */
export function writeSimulationFiles(run: SeedRun, out: string): string[] {
  mkdirSync(out, { recursive: true });
  const first: BenchmarkReport = run.reports[0]!;
  const csv = toCsv(first);
  const seed = run.seeds[0];
  const summary = [
    SUMMARY_COLUMNS.join(","),
    ...run.rows.map((r) =>
      ["true", r.round, cell(r.approvalOnMean), cell(r.approvalOnMin), cell(r.approvalOnMax), cell(r.approvalTightenOnlyMean), cell(r.approvalOffMean), cell(r.approvalOffMin),
        cell(r.approvalOffMax), cell(r.approvalOnRetryMean), cell(r.confirmedPer100OnMean), cell(r.confirmedPer100TightenOnlyMean), cell(r.confirmedPer100OffMean),
        cell(r.confirmedPer100OnRetryMean), cell(r.confirmedPer100OffRetryMean), cell(r.confirmedPer100OrderedOpenMean), cell(r.confirmedPer100OracleMean),
        cell(r.ownerCardsPer100OnMean), cell(r.ownerCardsPer100OnRetryMean), cell(r.stretchOffersOnMean), cell(r.stretchAcceptedOnMean), cell(r.stretchConfirmedOnMean),
        cell(r.interruptionsOnMean), cell(r.interruptionsTightenOnlyMean)].join(","),
    ),
  ].join("\n") + "\n";
  const files: Record<string, string> = {
    "summary.csv": summary,
    [`per_round_seed${seed}.csv`]: csv.perRound,
    [`comparison_seed${seed}.csv`]: csv.comparison,
    [`failures_seed${seed}.csv`]: csv.failures,
    "headroom.json": JSON.stringify(run.headroom, null, 2),
    "summary.json": JSON.stringify({ simulated: true, label: run.label, seeds: run.seeds, notes: first.notes, failureCounts: first.failureCounts, config: first.config }, null, 2),
  };
  for (const [name, text] of Object.entries(files)) writeFileSync(join(out, name), text);
  return Object.keys(files);
}

type SummaryRow = Record<(typeof SUMMARY_COLUMNS)[number], number | null>;

/** Read `summary.csv` back, so a chart is drawn from the file the benchmark wrote and not from memory. */
export function readSummaryCsv(dir: string): SummaryRow[] {
  const [head, ...lines] = readFileSync(join(dir, "summary.csv"), "utf8").trim().split("\n");
  const cols = head!.split(",");
  return lines.map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] === "" || cells[i] === undefined ? null : c === "simulated" ? 1 : Number(cells[i])])) as SummaryRow;
  });
}

export function readSimulationMeta(dir: string): { label: string; seeds: number[]; notes: string[]; failureCounts: Record<string, number>; config: BenchmarkReport["config"]; headroom: Headroom } {
  const meta = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  const headroom = JSON.parse(readFileSync(join(dir, "headroom.json"), "utf8")) as Headroom;
  return { ...meta, headroom };
}

export const hasSimulationFiles = (dir: string) => existsSync(join(dir, "summary.csv")) && existsSync(join(dir, "headroom.json")) && existsSync(join(dir, "summary.json"));
