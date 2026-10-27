import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasSimulationFiles, readSimulationMeta, readSummaryCsv, runBenchmarkSeeds, writeSimulationFiles } from "@/features/simulation/public-api/infrastructure";

export type Scenario = "stable" | "drift";

const ROOT = join(process.cwd(), "reports", "simulation");
const SEEDS = [20261027, 20261028, 20261029, 20261030, 20261031];
const running = new Map<Scenario, Promise<void>>();

const dirOf = (s: Scenario) => join(ROOT, s);

async function generate(s: Scenario): Promise<void> {
  const run = await runBenchmarkSeeds(s === "drift" ? { rounds: 10, seeds: SEEDS, trainEpisodes: 2, evalEpisodes: 3, drift: { fromRound: 5, factor: 2 } } : { rounds: 8, seeds: SEEDS, trainEpisodes: 2, evalEpisodes: 3 });
  writeSimulationFiles(run, dirOf(s));
}

/** Make sure the simulation's CSV and JSON files exist for a scenario, running the benchmark (a few seconds) the first time. */
export async function ensureReports(s: Scenario, force = false): Promise<void> {
  if (!force && hasSimulationFiles(dirOf(s))) return;
  let p = running.get(s);
  if (!p) {
    p = generate(s).finally(() => running.delete(s));
    running.set(s, p);
  }
  await p;
}

/** Sum of unauthorized commitments over every arm and round in the first seed's per-round file (must be 0). */
function unauthorizedIn(dir: string): number {
  const file = readdirSync(dir).find((f) => f.startsWith("per_round_seed"));
  if (!file) return 0;
  const [head, ...lines] = readFileSync(join(dir, file), "utf8").trim().split("\n");
  const i = head!.split(",").indexOf("unauthorized_commitments");
  return i < 0 ? 0 : lines.reduce((a, l) => a + (Number(l.split(",")[i]) || 0), 0);
}

/** The dashboard's data, read back from the files the benchmark wrote (the chart is drawn from the CSV). */
export async function loadDashboard(s: Scenario) {
  await ensureReports(s);
  return { scenario: s, rows: readSummaryCsv(dirOf(s)), unauthorizedCommitments: unauthorizedIn(dirOf(s)), ...readSimulationMeta(dirOf(s)) };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
