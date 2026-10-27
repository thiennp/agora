import { loadApp } from "@/lib/app-config";
import type { AppConfig } from "@/lib/app-config";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createLearning } from "@/features/learning/public-api/infrastructure";
import { createMatchService, districtDistanceKm } from "@/features/matching/public-api/infrastructure";
import { createLocalProvider } from "@/features/memory/public-api/infrastructure";
import { createNegotiationService } from "@/features/negotiation/public-api/infrastructure";
import { createMandateBook, createMandateStore, createOwnerCards, eligibleStandingTopics } from "@/features/owner-cards/public-api/infrastructure";
import { generateScenario, loadCity, SIM_LABEL } from "../../../city/public-api/infrastructure";
import type { City } from "../../../city/public-api/types";
import { acceptableToBoth, deriveHiddenRules, judge } from "../../../simulated-owner/public-api/infrastructure";
import type { HiddenRules } from "../../../simulated-owner/public-api/types";
import { emptyResult, merge, summarize, type EpisodeResult, type Failure, type RoundMetrics } from "../core/metrics";

const NOW = new Date("2026-10-27T12:00:00Z");
const FORWARDED = ["OwnerAnswered", "OwnerDecision", "DealConfirmed", "DealDeclined", "DealExpired", "HandoffFinished"] as const;

export interface SimulationOptions {
  appId?: string;
  seed: number;
  /** True: lessons are learned from training episodes and applied. False: the baseline that never learns. */
  learning: boolean;
  root?: string;
  city?: City;
}

/**
 * One simulated city. Every episode runs the real slices (catalog, matching, negotiation, owner cards, gatekeeper, learning) with
 * deterministic ids and no live model, against owners whose hidden rules the agents cannot see (SIM-01, SIM-OWN-01, SIM-02).
 * Held-out episodes read learned limits but never write lessons, so what is measured was not learned from (SIM-03).
 */
export async function createSimulation(opts: SimulationOptions) {
  const appId = opts.appId ?? "kids-gear";
  const app: AppConfig = await loadApp(appId);
  if (app.policies.pricing.mode === "swap_only") throw new Error("the simulation currently supports apps whose deals can be free; swap-only apps need owner-supplied swaps");
  const city = opts.city ?? (await loadCity(appId, opts.seed, opts.root));
  const byId = new Map(city.families.map((f) => [f.id, f]));
  const hidden = new Map<string, HiddenRules>(city.families.map((f) => [f.id, deriveHiddenRules(app, f.id, f.style, opts.seed)]));

  const memory = createLocalProvider();
  const store = createMandateStore();
  const registryGatekeeper = createGatekeeper({ app, now: () => NOW });
  let counter = 0;
  const book = createMandateBook({ app, gatekeeper: registryGatekeeper, store, now: () => NOW, newId: () => `m${++counter}` });
  for (const f of city.families) book.setLimits(f.id, { availability: f.availability, allowedTerms: ["free"] });

  const persistentBus = createDealEventBus();
  const dealInfo = new Map<string, { offerFamilyId: string; wantFamilyId: string; category?: string }>();
  const learning = opts.learning
    ? createLearning({
        app, memory, bus: persistentBus, now: () => NOW, newId: () => `l${++counter}`,
        dealInfo: async (id) => dealInfo.get(id) ?? null,
        rules: { eligibleTopics: () => eligibleStandingTopics(app), activeTopics: (f) => book.list(f).map((m) => m.topic), add: (i) => book.add(i) },
      })
    : null;

  /** Limits for one family at the start of an episode: what the owner set, tightened by what was learned. */
  async function limitsFor(familyId: string) {
    const base = book.limitsOf(familyId);
    const l = learning ? await learning.limitsFor(familyId, { maxDistanceKm: base.maxDistanceKm }) : { maxDistanceKm: base.maxDistanceKm, minCondition: undefined, strictSizeCategories: [] as string[] };
    return {
      limits: { maxDistanceKm: l.maxDistanceKm, blockedCategories: base.blockedCategories, strictSizeCategories: l.strictSizeCategories ?? [] },
      wantCondition: l.minCondition,
    };
  }

  async function runEpisode(key: string, round: number, train: boolean): Promise<EpisodeResult> {
    const result = emptyResult();
    const bus = createDealEventBus();
    if (train && learning) for (const t of FORWARDED) bus.subscribe(t, (e) => persistentBus.publish(e as never));
    const gatekeeper = createGatekeeper({ app, now: () => NOW });
    for (const f of city.families) for (const m of book.list(f.id)) gatekeeper.addMandate({ familyId: f.id, topic: m.topic, level: "auto", expiresAt: m.expiresAt });
    let n = 0;
    const newId = () => `${key}-${++n}`;
    const catalog = createCatalogService({ app, canShare: () => true, newId });
    const negotiation = createNegotiationService({ app, items: catalog.items, gatekeeper, bus, now: () => NOW, newId, mandateOf: (f) => book.negotiationMandate(f, byId.get(f)!.language) });
    const cards = createOwnerCards({ app, negotiation, bus, mandates: book, now: () => NOW, newId, languageOf: (f) => byId.get(f)!.language });
    let lastDeclineReason = "";
    bus.subscribe("DealDeclined", (e) => void (lastDeclineReason = e.reason));

    const limits = new Map<string, Awaited<ReturnType<typeof limitsFor>>>();
    for (const f of city.families) limits.set(f.id, await limitsFor(f.id));
    const matcher = createMatchService({ app, now: () => NOW, topN: 3, limitsOf: (f) => limits.get(f)!.limits });

    const scenario = generateScenario(app, city, key, opts.seed);
    const wantItems = new Map<string, { id: string; size?: string }>();
    const offerItems = new Map<string, { id: string; family: string; size?: string; condition?: string }>();
    for (const s of scenario) {
      const f = byId.get(s.familyId)!;
      const o = await catalog.items.create(f.id, { kind: "offer", category: s.offer.category, size: s.offer.size, condition: s.offer.condition, description: "item" });
      const w = await catalog.items.create(f.id, { kind: "want", category: s.want.category, size: s.want.size, condition: limits.get(f.id)!.wantCondition });
      await catalog.items.list(o.id);
      await catalog.items.list(w.id);
      offerItems.set(o.id, { id: o.id, family: f.id, size: s.offer.size, condition: s.offer.condition });
      wantItems.set(f.id, { id: w.id, size: s.want.size });
      const common = { appId: app.id, createdAt: NOW.toISOString(), districtCode: f.districtCode };
      matcher.onListed({ ...common, id: o.id, familyId: f.id, kind: "offer", category: s.offer.category, size: s.offer.size, condition: s.offer.condition });
    }

    for (const fam of city.families) {
      const s = scenario.find((x) => x.familyId === fam.id)!;
      const want = wantItems.get(fam.id)!;
      result.wants += 1;
      const res = matcher.candidatesFor({
        appId: app.id, createdAt: NOW.toISOString(), districtCode: fam.districtCode, id: want.id, familyId: fam.id, kind: "want",
        category: s.want.category, size: s.want.size, condition: limits.get(fam.id)!.wantCondition,
      });

      // Match relevance: how many of the top 3 would both owners really accept?
      for (const m of res.matches) {
        const off = offerItems.get(m.offerItemId)!;
        const giver = byId.get(off.family)!;
        const facts = { distanceKm: districtDistanceKm(fam.districtCode, giver.districtCode), offerCondition: off.condition, offerSize: off.size, wantSize: want.size };
        result.top3Total += 1;
        if (acceptableToBoth(app, hidden.get(giver.id)!, hidden.get(fam.id)!, facts)) result.top3Acceptable += 1;
      }
      const pick = res.matches[0];
      if (!pick) {
        result.noMatch += 1;
        result.failures.push({ arm: opts.learning ? "learning_on" : "learning_off", round, kind: "no_match", familyIds: [fam.id], category: s.want.category });
        continue;
      }
      const off = offerItems.get(pick.offerItemId)!;
      const giver = byId.get(off.family)!;
      const cross = giver.language !== fam.language;
      matcher.onUnlisted(off.id);
      const deal = await negotiation.start({ offerItemId: off.id, wantItemId: want.id, offerFamilyId: giver.id, wantFamilyId: fam.id });
      dealInfo.set(deal.id, { offerFamilyId: giver.id, wantFamilyId: fam.id, category: s.want.category });
      result.started += 1;
      if (cross) result.crossStarted += 1;
      const arm = opts.learning ? "learning_on" : "learning_off";
      const fail = (f: Omit<Failure, "arm" | "round" | "familyIds" | "category">) => result.failures.push({ arm, round, familyIds: [fam.id, giver.id], category: s.want.category, ...f });

      // The simulated owners answer scheduling questions (always yes), as a real owner who agrees would.
      let d = await negotiation.run(deal.id);
      for (let i = 0; i < 8 && d.state === "awaiting_owner_input" && d.pending; i++) {
        await cards.settled();
        const q = cards.questionsFor(d.pending.familyId).find((x) => x.dealId === deal.id);
        if (!q) break;
        result.questions += 1;
        d = await cards.answerQuestion(q.id, d.pending.familyId, "yes");
      }
      if (d.state !== "awaiting_owners") {
        result.agentsDeclined += 1;
        fail({ kind: "agents_declined", reason: d.state === "declined" ? lastDeclineReason || "declined" : d.state });
        continue;
      }
      result.agreed += 1;
      result.roundsSum += d.round;

      const facts = { distanceKm: districtDistanceKm(fam.districtCode, giver.districtCode), offerCondition: off.condition, offerSize: off.size, wantSize: want.size };
      let bothConfirmed = true;
      for (const [owner, role] of [[fam, "receiver"], [giver, "giver"]] as const) {
        if ((await negotiation.get(deal.id))?.state !== "awaiting_owners") break;
        await cards.settled();
        const card = cards.confirmationsFor(owner.id).find((c) => c.dealId === deal.id);
        if (!card) break;
        const v = judge(app, hidden.get(owner.id)!, role, facts);
        result.decisions += 1;
        if (v.confirm) {
          result.approvals += 1;
          await cards.decide(card.id, owner.id, "confirm");
        } else {
          bothConfirmed = false;
          result.declines[v.reason] = (result.declines[v.reason] ?? 0) + 1;
          fail({ kind: "owner_declined", reason: v.reason, role });
          await cards.decide(card.id, owner.id, "decline", { code: v.reason === "condition" ? "condition" : v.reason });
          break;
        }
      }
      const final = await negotiation.get(deal.id);
      if (final?.state === "confirmed") {
        result.confirmed += 1;
        if (cross) result.crossConfirmed += 1;
        if (!bothConfirmed) result.unauthorized += 1;
      }
    }

    if (train && learning) {
      await learning.settled();
      // Simulated owners opt in to every standing-rule proposal (opt-in is what makes a rule active).
      for (const f of city.families) for (const p of learning.proposalsFor(f.id)) learning.acceptProposal(f.id, p.id);
    }
    return result;
  }

  async function counts() {
    let lessons = 0;
    let standingRules = 0;
    for (const f of city.families) {
      lessons += (await memory.getFamilyContext(f.id)).lessons.length;
      standingRules += book.list(f.id).length;
    }
    return { lessons, standingRules };
  }

  return {
    city,
    memory,
    /** Held-out episodes: limits come from what was learned so far, nothing is written back (SIM-03). */
    async evalRound(round: number, episodes: number): Promise<{ result: EpisodeResult; metrics: RoundMetrics }> {
      const before = await counts();
      let total = emptyResult();
      for (let e = 0; e < episodes; e++) total = merge(total, await runEpisode(`eval-${round}-${e}`, round, false));
      return { result: total, metrics: summarize(opts.learning ? "learning_on" : "learning_off", round, total, before) };
    },
    /** Training episodes: new scenarios, lessons are learned and standing rules proposed and accepted. Does nothing for the baseline. */
    async trainRound(round: number, episodes: number): Promise<void> {
      if (!learning) return;
      for (let t = 0; t < episodes; t++) await runEpisode(`train-${round}-${t}`, round, true);
    },
    label: SIM_LABEL,
  };
}

export type Simulation = Awaited<ReturnType<typeof createSimulation>>;

export interface BenchmarkOptions {
  appId?: string;
  seed?: number;
  rounds?: number;
  trainEpisodes?: number;
  evalEpisodes?: number;
  root?: string;
}

export interface BenchmarkReport {
  simulated: true;
  label: string;
  app: string;
  seed: number;
  config: { rounds: number; trainEpisodes: number; evalEpisodes: number; families: number; languages: string[] };
  /** Held-out metrics per arm and round. */
  arms: Record<"learning_on" | "learning_off", RoundMetrics[]>;
  comparison: { round: number; on: number | null; off: number | null; delta: number | null; confirmedPer100On: number | null; confirmedPer100Off: number | null }[];
  failures: Failure[];
  failureCounts: Record<string, number>;
  notes: string[];
}

/** Failures kept per arm and kind in the report; the counts cover all of them. */
const MAX_FAILURES_PER_KIND = 40;

function sampleFailures(all: Failure[]): Failure[] {
  const seen = new Map<string, number>();
  return all.filter((f) => {
    const k = `${f.arm}:${f.kind}:${f.reason ?? ""}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n <= MAX_FAILURES_PER_KIND;
  });
}

/** Run both arms with the same city and seeds and compare them on held-out episodes only (SIM-BEN-01, 02, 04). */
export async function runBenchmark(o: BenchmarkOptions = {}): Promise<BenchmarkReport> {
  const seed = o.seed ?? 20261027;
  const rounds = o.rounds ?? 8;
  const trainEpisodes = o.trainEpisodes ?? 2;
  const evalEpisodes = o.evalEpisodes ?? 3;
  const arms = { learning_on: [] as RoundMetrics[], learning_off: [] as RoundMetrics[] };
  const failures: Failure[] = [];
  let families = 0;
  let languages: string[] = [];
  for (const [name, learning] of [["learning_on", true], ["learning_off", false]] as const) {
    const sim = await createSimulation({ appId: o.appId, seed, learning, root: o.root });
    families = sim.city.families.length;
    languages = [...new Set(sim.city.families.map((f) => f.language))].sort();
    for (let r = 1; r <= rounds; r++) {
      const { result, metrics } = await sim.evalRound(r, evalEpisodes);
      arms[name].push(metrics);
      failures.push(...result.failures);
      await sim.trainRound(r, trainEpisodes);
    }
  }
  const failureCounts: Record<string, number> = {};
  for (const f of failures) {
    const k = `${f.arm}:${f.kind}${f.reason ? `:${f.reason}` : ""}`;
    failureCounts[k] = (failureCounts[k] ?? 0) + 1;
  }
  const comparison = arms.learning_on.map((on, i) => {
    const off = arms.learning_off[i]!;
    const delta = on.ownerApprovalRate !== null && off.ownerApprovalRate !== null ? Math.round((on.ownerApprovalRate - off.ownerApprovalRate) * 1000) / 1000 : null;
    return { round: on.round, on: on.ownerApprovalRate, off: off.ownerApprovalRate, delta, confirmedPer100On: on.confirmedPer100Wants, confirmedPer100Off: off.confirmedPer100Wants };
  });
  return {
    simulated: true, label: SIM_LABEL, app: o.appId ?? "kids-gear", seed,
    config: { rounds, trainEpisodes, evalEpisodes, families, languages },
    arms, comparison, failures: sampleFailures(failures), failureCounts,
    notes: [
      "Reported numbers come from held-out episodes only: scenarios that no lesson was learned from. Round 1 is measured before anything is learned, so both arms start equal.",
      "Cost per deal is not measured: the simulation uses template notes and no live model, so there is no real cost to report. Re-run with a Meta key to measure it.",
      "Model choices (Spark Open versus Spark API for the negotiator) are not compared: that needs live model calls. The harness runs the same city and seeds for any routing once a key exists.",
      "Learning raises the approval rate partly by proposing fewer, better deals: its no-match rate rises as limits tighten. Read the approval rate together with confirmed deals per 100 wants, which does not reward proposing less.",
      "Owners' hidden rules are generated from persona styles and a seed; they are a stand-in for real preferences, so absolute rates say little and the learning-on versus learning-off difference is what matters.",
    ],
  };
}

export interface SeedSummaryRow {
  round: number;
  approvalOnMean: number | null;
  approvalOnMin: number | null;
  approvalOnMax: number | null;
  approvalOffMean: number | null;
  approvalOffMin: number | null;
  approvalOffMax: number | null;
  confirmedPer100OnMean: number | null;
  confirmedPer100OffMean: number | null;
}

const mean = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null;
};
const lo = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? Math.min(...xs.filter((x): x is number => x !== null)) : null);
const hi = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? Math.max(...xs.filter((x): x is number => x !== null)) : null);

/** The same benchmark over several seeds, summarised as mean and range per round: no single lucky seed (SIM-03, SIM-04). */
export async function runBenchmarkSeeds(o: BenchmarkOptions & { seeds: number[] }): Promise<{ simulated: true; label: string; seeds: number[]; rows: SeedSummaryRow[]; reports: BenchmarkReport[] }> {
  const reports: BenchmarkReport[] = [];
  for (const seed of o.seeds) reports.push(await runBenchmark({ ...o, seed }));
  const rounds = reports[0]?.comparison.length ?? 0;
  const rows: SeedSummaryRow[] = [];
  for (let i = 0; i < rounds; i++) {
    const on = reports.map((r) => r.arms.learning_on[i]!.ownerApprovalRate);
    const off = reports.map((r) => r.arms.learning_off[i]!.ownerApprovalRate);
    rows.push({
      round: i + 1, approvalOnMean: mean(on), approvalOnMin: lo(on), approvalOnMax: hi(on), approvalOffMean: mean(off), approvalOffMin: lo(off), approvalOffMax: hi(off),
      confirmedPer100OnMean: mean(reports.map((r) => r.arms.learning_on[i]!.confirmedPer100Wants)), confirmedPer100OffMean: mean(reports.map((r) => r.arms.learning_off[i]!.confirmedPer100Wants)),
    });
  }
  return { simulated: true, label: SIM_LABEL, seeds: o.seeds, rows, reports };
}
