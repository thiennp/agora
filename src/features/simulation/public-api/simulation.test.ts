import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { buildCity, generateScenario, loadCity, SIM_LABEL } from "../features/city/public-api/infrastructure";
import { createSimulation, runBenchmark, runBenchmarkSeeds, toCsv } from "./infrastructure";

const small = { rounds: 3, trainEpisodes: 1, evalEpisodes: 2 };

describe("sandbox city", () => {
  it("builds 20 synthetic families in three languages on a synthetic map, deterministically (SIM-01, SIM-CTY-01)", async () => {
    const a = await loadCity("kids-gear", 1);
    const b = await loadCity("kids-gear", 1);
    expect(a).toEqual(b);
    expect(a.synthetic).toBe(true);
    expect(a.label).toBe(SIM_LABEL);
    expect(a.families).toHaveLength(20);
    expect([...new Set(a.families.map((f) => f.language))].sort()).toEqual(["de", "en", "vi"]);
    expect(a.families.every((f) => /^g:\d+\.\d\d:\d+\.\d\d$/.test(f.districtCode))).toBe(true);
    expect(a.families.some((f) => f.availability.length > 0)).toBe(true);
    expect(a.families.some((f) => f.availability.length === 0)).toBe(true);
  });

  it("generates scenarios that are reproducible per key and different between training and held-out keys (SIM-02, SIM-03)", async () => {
    const app = await loadApp("kids-gear");
    const city = await loadCity("kids-gear", 1);
    expect(generateScenario(app, city, "eval-1-0", 1)).toEqual(generateScenario(app, city, "eval-1-0", 1));
    expect(generateScenario(app, city, "eval-1-0", 1)).not.toEqual(generateScenario(app, city, "train-1-0", 1));
    expect(generateScenario(app, city, "eval-1-0", 1)).not.toEqual(generateScenario(app, city, "eval-1-0", 2));
    const s = generateScenario(app, city, "eval-1-0", 1);
    expect(s.every((x) => app.catalog.categories.some((c) => c.id === x.offer.category) && app.catalog.conditions.includes(x.offer.condition!))).toBe(true);
  });

  it("rejects an invalid sandbox and swap-only apps", async () => {
    expect(() => buildCity({ id: "x" }, [], [], 1)).not.toThrow();
    await expect(createSimulation({ appId: "garden-tools", seed: 1, learning: true })).rejects.toThrow(/swap-only/);
  });
});

describe("benchmark", () => {
  it("is reproducible: the same seed gives the same results (SIM-02)", async () => {
    const a = await runBenchmark({ ...small, seed: 7 });
    const b = await runBenchmark({ ...small, seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(await runBenchmark({ ...small, seed: 8 }))).not.toBe(JSON.stringify(a));
  });

  it("starts both arms equal because round 1 is measured before anything is learned", async () => {
    const r = await runBenchmark({ ...small, seed: 11 });
    const { ownerApprovalRate: _a, ...on } = r.arms.learning_on[0]!;
    const { ownerApprovalRate: _b, ...off } = r.arms.learning_off[0]!;
    expect({ ...on, lessons: 0, standingRules: 0, arm: "" }).toEqual({ ...off, lessons: 0, standingRules: 0, arm: "" });
    expect(r.arms.learning_on[0]!.lessons).toBe(0);
  });

  it("never writes lessons from held-out episodes, only from training (SIM-03)", async () => {
    const sim = await createSimulation({ seed: 5, learning: true });
    const count = async () => (await Promise.all(sim.city.families.map((f) => sim.memory.getFamilyContext(f.id)))).flatMap((c) => c.lessons.map((l) => `${l.key}:${l.count}`)).sort();
    await sim.evalRound(1, 2);
    expect(await count()).toEqual([]);
    await sim.trainRound(1, 2);
    const learned = await count();
    expect(learned.length).toBeGreaterThan(0);
    await sim.evalRound(2, 2);
    expect(await count()).toEqual(learned);
  });

  it("keeps the baseline from learning anything", async () => {
    const sim = await createSimulation({ seed: 5, learning: false });
    await sim.trainRound(1, 2);
    await sim.evalRound(1, 1);
    expect((await Promise.all(sim.city.families.map((f) => sim.memory.getFamilyContext(f.id)))).flatMap((c) => c.lessons)).toEqual([]);
  });

  it("shows learning helping on held-out episodes across seeds, without flattering the numbers (SIM-BEN-02)", async () => {
    const run = await runBenchmarkSeeds({ rounds: 6, trainEpisodes: 2, evalEpisodes: 3, seeds: [20261027, 20261028, 20261029] });
    const last = run.rows.at(-1)!;
    const first = run.rows[0]!;
    expect(first.approvalOnMean).toBe(first.approvalOffMean);
    expect(last.approvalOnMean!).toBeGreaterThan(last.approvalOffMean! + 0.15);
    // Learning also confirms more deals per want, not only a higher rate from proposing less.
    expect(last.confirmedPer100OnMean!).toBeGreaterThan(last.confirmedPer100OffMean!);
    for (const r of run.rows) {
      expect(r.approvalOnMin!).toBeLessThanOrEqual(r.approvalOnMean!);
      expect(r.approvalOnMean!).toBeLessThanOrEqual(r.approvalOnMax!);
    }
    expect(run.rows).toHaveLength(6);
  });

  it("has an oracle ceiling that the learning arms stay below, so headroom is visible", async () => {
    const run = await runBenchmarkSeeds({ rounds: 6, trainEpisodes: 2, evalEpisodes: 3, seeds: [20261027, 20261028, 20261029] });
    for (const r of run.rows) {
      expect(r.confirmedPer100OracleMean!).toBeGreaterThanOrEqual(r.confirmedPer100OnMean!);
      expect(r.confirmedPer100OracleMean!).toBeGreaterThanOrEqual(r.confirmedPer100OffMean!);
    }
    for (const rep of run.reports) for (const m of rep.arms.oracle_ceiling) {
      expect(m.ownerApprovalRate).toBe(1);
      expect(m.unauthorizedCommitments).toBe(0);
    }
  });

  it("asks before relaxing a learned limit, never nags, and costs few interruptions (LRN-09, LRN-10)", async () => {
    const run = await runBenchmarkSeeds({ rounds: 8, trainEpisodes: 2, evalEpisodes: 3, seeds: [20261027, 20261028, 20261029, 20261030, 20261031] });
    for (const rep of run.reports) {
      for (const arm of ["learning_tighten_only", "learning_off", "oracle_ceiling"] as const) for (const m of rep.arms[arm]) expect(m.stretchOffers).toBe(0);
      for (const m of rep.arms.learning_on) {
        expect(m.stretchConfirmed).toBeLessThanOrEqual(m.stretchAccepted);
        expect(m.stretchAccepted).toBeLessThanOrEqual(m.stretchOffers);
        // never more cards than wants, and only a small share of them
        expect(m.stretchOffers).toBeLessThanOrEqual(m.wants * 0.25);
      }
    }
    const extra = run.rows.map((r) => r.interruptionsOnMean! - r.interruptionsTightenOnlyMean!);
    expect(extra.reduce((a, b) => a + b, 0) / extra.length).toBeLessThan(0.1);
    // relaxing never costs confirmed deals compared with only tightening
    expect(run.rows.reduce((a, r) => a + r.confirmedPer100OnMean!, 0)).toBeGreaterThanOrEqual(run.rows.reduce((a, r) => a + r.confirmedPer100TightenOnlyMean!, 0) - 0.5);
  });

  it("recovers coverage with the owner's approval when owners' preferences loosen (drift from round 5)", async () => {
    const run = await runBenchmarkSeeds({ rounds: 10, trainEpisodes: 2, evalEpisodes: 3, seeds: [20261027, 20261028, 20261029, 20261030, 20261031], drift: { fromRound: 5, factor: 2 } });
    expect(run.reports[0]!.config.drift).toEqual({ fromRound: 5, factor: 2 });
    const after = run.rows.filter((r) => r.round >= 6);
    const avg = (f: (r: (typeof after)[number]) => number | null) => after.reduce((a, r) => a + (f(r) ?? 0), 0) / after.length;
    const on = avg((r) => r.confirmedPer100OnMean);
    const tight = avg((r) => r.confirmedPer100TightenOnlyMean);
    const off = avg((r) => r.confirmedPer100OffMean);
    // Tightening alone loses confirmed deals once owners loosen; relaxing with approval wins back most of it.
    expect(tight).toBeLessThan(off);
    expect(on).toBeGreaterThan(tight + 0.5);
    expect((on - tight) / (off - tight)).toBeGreaterThan(0.4);
    // approval still far above no learning, and the oracle shows how much headroom remains
    expect(avg((r) => r.approvalOnMean)).toBeGreaterThan(avg((r) => r.approvalOffMean) + 0.2);
    expect(avg((r) => r.confirmedPer100OracleMean)).toBeGreaterThan(on);
    // the cost in owner questions stays small
    expect(avg((r) => r.interruptionsOnMean) - avg((r) => r.interruptionsTightenOnlyMean)).toBeLessThan(0.1);
    // some stretch deals were approved and confirmed, and every one of them started from an approved card
    const stretchConfirmed = run.reports.flatMap((r) => r.arms.learning_on).reduce((a, m) => a + m.stretchConfirmed, 0);
    const stretchAccepted = run.reports.flatMap((r) => r.arms.learning_on).reduce((a, m) => a + m.stretchAccepted, 0);
    expect(stretchConfirmed).toBeGreaterThan(0);
    expect(stretchConfirmed).toBeLessThanOrEqual(stretchAccepted);
  });

  it("produces the plan's metrics and zero unauthorized commitments (SIM-BEN-01, metric 8)", async () => {
    const r = await runBenchmark({ ...small, seed: 3 });
    for (const m of [...r.arms.learning_on, ...r.arms.learning_off]) {
      expect(m.unauthorizedCommitments).toBe(0);
      expect(m.simulated).toBe(true);
      for (const k of ["ownerApprovalRate", "dealSuccessRate", "noMatchRate", "precisionAt3", "avgRoundsToAgreement", "crossLanguageSuccessRate", "interruptionsPerDeal", "confirmedPer100Wants"] as const) {
        expect(k in m).toBe(true);
      }
      expect(m.avgRoundsToAgreement === null || (m.avgRoundsToAgreement >= 1 && m.avgRoundsToAgreement <= 3)).toBe(true);
    }
    expect(r.config).toMatchObject({ families: 20, languages: ["de", "en", "vi"] });
  });

  it("keeps failures in the report, synthetic and labelled, with honest notes (SIM-04, SIM-05)", async () => {
    const r = await runBenchmark({ ...small, seed: 3 });
    expect(r.simulated).toBe(true);
    expect(r.label).toMatch(/^SIMULATED/);
    expect(r.failures.length).toBeGreaterThan(0);
    expect(r.failures.every((f) => f.familyIds.every((id) => /^f\d+$/.test(id)))).toBe(true);
    expect(Object.keys(r.failureCounts).length).toBeGreaterThan(0);
    expect(r.notes.join(" ")).toMatch(/Cost per deal is not measured/);
    expect(r.notes.join(" ")).toMatch(/Model choices .* not compared/);
    expect(r.notes.join(" ")).toMatch(/proposing fewer/);
  });

  it("exports CSV where every row says simulated=true (SIM-BEN-03, SIM-05)", async () => {
    const r = await runBenchmark({ ...small, seed: 3 });
    const csv = toCsv(r);
    for (const text of [csv.perRound, csv.comparison, csv.failures]) {
      const lines = text.trim().split("\n");
      expect(lines[0]!.startsWith("simulated,")).toBe(true);
      expect(lines.slice(1).every((l) => l.startsWith("true,"))).toBe(true);
    }
    expect(csv.perRound.trim().split("\n")).toHaveLength(1 + 4 * small.rounds);
    expect(csv.comparison.trim().split("\n")).toHaveLength(1 + small.rounds);
  });
});

describe("hidden rules stay hidden (SIM-OWN-01)", () => {
  it("are referenced only inside the simulation slice", () => {
    const hits: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) return walk(p);
      if (!/\.(ts|tsx)$/.test(p) || /\.test\.ts$/.test(p) || p.includes("src/features/simulation/")) return;
      if (/deriveHiddenRules|HiddenRules|hidden-accept-rules/.test(readFileSync(p, "utf8"))) hits.push(p);
    });
    walk("src");
    expect(hits).toEqual([]);
  });
});
