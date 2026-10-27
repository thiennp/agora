import { loadApp } from "@/lib/app-config";
import type { AppConfig } from "@/lib/app-config";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { blockedByLearned, createLearning } from "@/features/learning/public-api/infrastructure";
import { createMatchService, districtDistanceKm } from "@/features/matching/public-api/infrastructure";
import { createLocalProvider } from "@/features/memory/public-api/infrastructure";
import { createNegotiationService } from "@/features/negotiation/public-api/infrastructure";
import { createMandateBook, createMandateStore, createOwnerCards, eligibleStandingTopics } from "@/features/owner-cards/public-api/infrastructure";
import { generateScenario, hashSeed, loadCity, SIM_LABEL } from "../../../city/public-api/infrastructure";
import type { City } from "../../../city/public-api/types";
import { acceptableToBoth, acceptsStretch, deriveHiddenRules, judge } from "../../../simulated-owner/public-api/infrastructure";
import type { HiddenRules } from "../../../simulated-owner/public-api/types";
import { emptyResult, merge, summarize, type EpisodeResult, type Failure, type RoundMetrics } from "../core/metrics";

const NOW = new Date("2026-10-27T12:00:00Z");
/** Most deals one want may start when the retry policy is on: the top three candidates. */
const MAX_ATTEMPTS = 3;
const FORWARDED = ["OwnerAnswered", "OwnerDecision", "DealConfirmed", "DealDeclined", "DealExpired", "HandoffFinished"] as const;

export type ArmName = "learning_on" | "learning_tighten_only" | "learning_off" | "oracle_ceiling" | "learning_on_retry" | "learning_off_retry";
/** learning_on learns and asks owners before looking beyond a learned limit; learning_tighten_only is the earlier behaviour; learning_off never learns. */
export const ARMS: { name: ArmName; learning: boolean; stretch: boolean; oracle?: boolean; retry?: boolean }[] = [
  { name: "learning_on", learning: true, stretch: true },
  { name: "learning_tighten_only", learning: true, stretch: false },
  { name: "learning_off", learning: false, stretch: false },
  // Not a product behaviour: an upper bound that knows every owner's hidden rules and picks, for each want, the best pair both owners accept.
  { name: "oracle_ceiling", learning: false, stretch: false, oracle: true },
  // Retry: after a decline, offer the next-best match (up to three in all). Tests whether trying more candidates, not learning, closes the gap to the ceiling.
  { name: "learning_on_retry", learning: true, stretch: true, retry: true },
  { name: "learning_off_retry", learning: false, stretch: false, retry: true },
];

export interface SimulationOptions {
  appId?: string;
  seed: number;
  /** True: lessons are learned from training episodes and applied. False: the baseline that never learns. */
  learning: boolean;
  /** True: when learned limits leave a want without a match, ask the owner whether to look beyond them (needs `learning`). */
  stretch?: boolean;
  /** Name used in failures and metrics. */
  arm?: ArmName;
  /** Ceiling arm: choose the best match both owners would accept, using the hidden rules. Not a real behaviour. */
  oracle?: boolean;
  /** After a decline, offer the next-best candidate (up to three in all). */
  retry?: boolean;
  /**
   * Preference drift: from `fromRound` on, half of the families (chosen by seed) tolerate `factor` times the distance. Tests whether
   * learned limits can recover when an owner's real preferences loosen.
   */
  drift?: { fromRound: number; factor: number };
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
  const armName: ArmName = opts.arm ?? (opts.oracle ? "oracle_ceiling" : opts.retry ? (opts.learning ? "learning_on_retry" : "learning_off_retry") : opts.learning ? (opts.stretch ? "learning_on" : "learning_tighten_only") : "learning_off");
  const app: AppConfig = await loadApp(appId);
  if (app.policies.pricing.mode === "swap_only") throw new Error("the simulation currently supports apps whose deals can be free; swap-only apps need owner-supplied swaps");
  const city = opts.city ?? (await loadCity(appId, opts.seed, opts.root));
  const byId = new Map(city.families.map((f) => [f.id, f]));
  const hiddenBase = new Map<string, HiddenRules>(city.families.map((f) => [f.id, deriveHiddenRules(app, f.id, f.style, opts.seed)]));
  const drifting = new Set(city.families.filter((f) => hashSeed("drift", opts.seed, f.id) % 2 === 0).map((f) => f.id));
  /** The owner's real rules in a given round: the same every round, except after the drift. */
  const hiddenAt = (familyId: string, round: number): HiddenRules => {
    const h = hiddenBase.get(familyId)!;
    return opts.drift && round >= opts.drift.fromRound && drifting.has(familyId) ? { ...h, maxDistanceKm: h.maxDistanceKm * opts.drift.factor } : h;
  };

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

    const wideMatcher = opts.oracle ? createMatchService({ app, now: () => NOW, topN: 50 }) : null;
    const scenario = generateScenario(app, city, key, opts.seed);
    type Indexed = Parameters<typeof matcher.onListed>[0];
    /** What the matcher was told about each offer, so a declined offer can go back on the list exactly as the catalog does. */
    const indexedOffers = new Map<string, Indexed>();
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
      const indexed: Indexed = { ...common, id: o.id, familyId: f.id, kind: "offer", category: s.offer.category, size: s.offer.size, condition: s.offer.condition };
      indexedOffers.set(o.id, indexed);
      matcher.onListed(indexed);
      wideMatcher?.onListed(indexed);
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
        if (acceptableToBoth(app, hiddenAt(giver.id, round), hiddenAt(fam.id, round), facts)) result.top3Acceptable += 1;
      }
      let pick = res.matches[0];
      if (wideMatcher) {
        // Oracle: among every candidate, the best-ranked one that both owners would accept under their hidden rules.
        const all = wideMatcher.candidatesFor({ appId: app.id, createdAt: NOW.toISOString(), districtCode: fam.districtCode, id: want.id, familyId: fam.id, kind: "want", category: s.want.category, size: s.want.size });
        pick = all.matches.find((m) => {
          const o = offerItems.get(m.offerItemId)!;
          const g = byId.get(o.family)!;
          return acceptableToBoth(app, hiddenAt(g.id, round), hiddenAt(fam.id, round), { distanceKm: m.distanceKm, offerCondition: o.condition, offerSize: o.size, wantSize: want.size });
        });
      }
      let stretchOfferId: string | undefined;
            if (!pick && opts.stretch && learning) {
        // Learned limits left nothing: look at what the owner's own base limits would allow, and ask before going beyond a learned limit.
        const lim = limits.get(fam.id)!;
        const own = book.limitsOf(fam.id);
        const wide = matcher.candidatesFor(
          { appId: app.id, createdAt: NOW.toISOString(), districtCode: fam.districtCode, id: want.id, familyId: fam.id, kind: "want", category: s.want.category, size: s.want.size },
          { limits: { maxDistanceKm: own.maxDistanceKm, blockedCategories: own.blockedCategories, strictSizeCategories: [] } },
        );
        for (const m of wide.matches) {
          const o = offerItems.get(m.offerItemId)!;
          const facts = { category: s.want.category, distanceKm: m.distanceKm, offerCondition: o.condition, offerSize: o.size, wantSize: want.size };
          const reasons = blockedByLearned({ maxDistanceKm: own.maxDistanceKm }, { maxDistanceKm: lim.limits.maxDistanceKm, minCondition: lim.wantCondition, strictSizeCategories: lim.limits.strictSizeCategories }, app.catalog.conditions, facts);
          if (reasons.length === 0) continue;
          const offer = learning.offerStretch(fam.id, { wantItemId: want.id, offerItemId: o.id, counterpartFamilyId: o.family, category: s.want.category, reasons, shown: { distanceKm: m.distanceKm, usualMaxKm: lim.limits.maxDistanceKm, offerCondition: o.condition, usualFloor: lim.wantCondition } });
          if (!offer) break; // backing off after a recent no
          result.stretchOffers += 1;
          const yes = acceptsStretch(app, hiddenAt(fam.id, round), reasons, { distanceKm: m.distanceKm, offerCondition: o.condition, offerSize: o.size, wantSize: want.size });
          learning.answerStretch(fam.id, offer.id, yes ? "yes" : "no");
          if (yes) {
            result.stretchAccepted += 1;
            pick = m;
            stretchOfferId = offer.id;
          }
          break;
        }
      }
      if (!pick) {
        result.noMatch += 1;
        result.failures.push({ arm: armName, round, kind: "no_match", reason: result.stretchOffers > 0 && !stretchOfferId && opts.stretch ? "stretch_declined_or_none" : undefined, familyIds: [fam.id], category: s.want.category });
        continue;
      }
      // After a decline the agent can offer the next-best match, up to the top three (retry arms only).
      const queue = [pick];
      if (opts.retry && pick === res.matches[0]) queue.push(...res.matches.slice(1, MAX_ATTEMPTS));
      for (const [attempt, cand] of queue.entries()) {
        let confirmedNow = false;
        const off = offerItems.get(cand.offerItemId)!;
        const giver = byId.get(off.family)!;
        const cross = giver.language !== fam.language;
        matcher.onUnlisted(off.id);
        wideMatcher?.onUnlisted(off.id);
        const deal = await negotiation.start({ offerItemId: off.id, wantItemId: want.id, offerFamilyId: giver.id, wantFamilyId: fam.id });
        dealInfo.set(deal.id, { offerFamilyId: giver.id, wantFamilyId: fam.id, category: s.want.category });
        if (attempt === 0 && stretchOfferId && learning) learning.linkStretchDeal(fam.id, stretchOfferId, deal.id);
        result.started += 1;
        if (attempt > 0) result.retries += 1;
        if (cross) result.crossStarted += 1;
        const fail = (f: Omit<Failure, "arm" | "round" | "familyIds" | "category">) => result.failures.push({ arm: armName, round, familyIds: [fam.id, giver.id], category: s.want.category, ...f });

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
          const v = judge(app, hiddenAt(owner.id, round), role, facts);
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
          if (attempt === 0 && stretchOfferId) result.stretchConfirmed += 1;
          if (attempt > 0) result.retryConfirmed += 1;
          confirmedNow = true;
          if (cross) result.crossConfirmed += 1;
          if (!bothConfirmed) result.unauthorized += 1;
        }
        if (confirmedNow) break;
        // A declined or failed deal frees both items (the catalog lists them again), so the offer is available to the next family too.
        const back = indexedOffers.get(off.id)!;
        matcher.onListed(back);
        wideMatcher?.onListed(back);
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
      return { result: total, metrics: summarize(armName, round, total, before) };
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
  drift?: { fromRound: number; factor: number };
}

export interface BenchmarkReport {
  simulated: true;
  label: string;
  app: string;
  seed: number;
  config: { rounds: number; trainEpisodes: number; evalEpisodes: number; families: number; languages: string[]; drift: { fromRound: number; factor: number } | null };
  /** Held-out metrics per arm and round. */
  arms: Record<ArmName, RoundMetrics[]>;
  comparison: {
    round: number;
    on: number | null;
    tightenOnly: number | null;
    off: number | null;
    delta: number | null;
    confirmedPer100On: number | null;
    confirmedPer100TightenOnly: number | null;
    confirmedPer100Off: number | null;
    /** Upper bound that knows the hidden rules; shows how much headroom exists. */
    confirmedPer100Oracle: number | null;
    confirmedPer100OnRetry: number | null;
    confirmedPer100OffRetry: number | null;
  }[];
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
  const arms: Record<ArmName, RoundMetrics[]> = { learning_on: [], learning_tighten_only: [], learning_off: [], oracle_ceiling: [], learning_on_retry: [], learning_off_retry: [] };
  const failures: Failure[] = [];
  let families = 0;
  let languages: string[] = [];
  for (const { name, learning, stretch, oracle, retry } of ARMS) {
    const sim = await createSimulation({ appId: o.appId, seed, learning, stretch, oracle, retry, arm: name, root: o.root, drift: o.drift });
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
    const tight = arms.learning_tighten_only[i]!;
    const oracle = arms.oracle_ceiling[i]!;
    const onRetry = arms.learning_on_retry[i]!;
    const offRetry = arms.learning_off_retry[i]!;
    const delta = on.ownerApprovalRate !== null && off.ownerApprovalRate !== null ? Math.round((on.ownerApprovalRate - off.ownerApprovalRate) * 1000) / 1000 : null;
    return { round: on.round, on: on.ownerApprovalRate, tightenOnly: tight.ownerApprovalRate, off: off.ownerApprovalRate, delta, confirmedPer100On: on.confirmedPer100Wants, confirmedPer100TightenOnly: tight.confirmedPer100Wants, confirmedPer100Off: off.confirmedPer100Wants, confirmedPer100Oracle: oracle.confirmedPer100Wants, confirmedPer100OnRetry: onRetry.confirmedPer100Wants, confirmedPer100OffRetry: offRetry.confirmedPer100Wants };
  });
  return {
    simulated: true, label: SIM_LABEL, app: o.appId ?? "kids-gear", seed,
    config: { rounds, trainEpisodes, evalEpisodes, families, languages, drift: o.drift ?? null },
    arms, comparison, failures: sampleFailures(failures), failureCounts,
    notes: [
      "Reported numbers come from held-out episodes only: scenarios that no lesson was learned from. Round 1 is measured before anything is learned, so both arms start equal.",
      "Cost per deal is not measured: the simulation uses template notes and no live model, so there is no real cost to report. Re-run with a Meta key to measure it.",
      "Model choices (Spark Open versus Spark API for the negotiator) are not compared: that needs live model calls. The harness runs the same city and seeds for any routing once a key exists.",
      "learning_tighten_only is the earlier behaviour: learned limits only ever tighten. It raises the approval rate partly by proposing fewer deals, so read approval together with confirmed deals per 100 wants, which does not reward proposing less.",
      "learning_on adds stretch cards: when learned limits leave a want without a match, the owner is asked whether to look at a match that only a learned limit excluded. A simulated owner judges the card from the facts it shows. Stretch cards count as owner questions in interruptions per deal.",
      ...(o.drift ? [`Preference drift: from round ${o.drift.fromRound}, half of the families tolerate ${o.drift.factor} times the distance. Learned limits were set earlier, so this tests whether they can recover.`] : []),
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
  approvalTightenOnlyMean: number | null;
  confirmedPer100OnMean: number | null;
  confirmedPer100TightenOnlyMean: number | null;
  confirmedPer100OffMean: number | null;
  confirmedPer100OracleMean: number | null;
  confirmedPer100OnRetryMean: number | null;
  confirmedPer100OffRetryMean: number | null;
  approvalOnRetryMean: number | null;
  ownerDecisionsPer100OnMean: number | null;
  ownerDecisionsPer100OnRetryMean: number | null;
  ownerDecisionsPer100OffMean: number | null;
  ownerDecisionsPer100OffRetryMean: number | null;
  ownerDecisionsPer100TightenOnlyMean: number | null;
  retryConfirmedOnRetryMean: number | null;
  stretchOffersOnMean: number | null;
  stretchAcceptedOnMean: number | null;
  interruptionsOnMean: number | null;
  interruptionsTightenOnlyMean: number | null;
  stretchConfirmedOnMean: number | null;
}

const mean = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null;
};
const lo = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? Math.min(...xs.filter((x): x is number => x !== null)) : null);
const hi = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? Math.max(...xs.filter((x): x is number => x !== null)) : null);

/** The same benchmark over several seeds, summarised as mean and range per round: no single lucky seed (SIM-03, SIM-04). */
export interface Headroom {
  /** Mean confirmed deals per 100 wants over the rounds after the first (and, with drift, over the rounds from the drift on). */
  rounds: number[];
  off: number;
  on: number;
  onRetry: number;
  offRetry: number;
  oracle: number;
  /** Owner confirm or decline cards answered per confirmed deal: what each arm costs owners' attention. */
  decisionsPerConfirmed: { off: number; tightenOnly: number; on: number; offRetry: number; onRetry: number };
  tightenOnly: number;
  /** Share of the gap between learning-on and the oracle ceiling that retrying the next candidate closes, in percent. */
  retryClosesGapPct: number | null;
  /** Share of the gap between no learning and the oracle that retrying alone (without learning) closes, in percent. */
  retryAloneClosesGapPct: number | null;
}

export async function runBenchmarkSeeds(o: BenchmarkOptions & { seeds: number[] }): Promise<{ simulated: true; label: string; seeds: number[]; rows: SeedSummaryRow[]; headroom: Headroom; reports: BenchmarkReport[] }> {
  const reports: BenchmarkReport[] = [];
  for (const seed of o.seeds) reports.push(await runBenchmark({ ...o, seed }));
  const rounds = reports[0]?.comparison.length ?? 0;
  const rows: SeedSummaryRow[] = [];
  for (let i = 0; i < rounds; i++) {
    const on = reports.map((r) => r.arms.learning_on[i]!.ownerApprovalRate);
    const off = reports.map((r) => r.arms.learning_off[i]!.ownerApprovalRate);
    rows.push({
      round: i + 1, approvalOnMean: mean(on), approvalOnMin: lo(on), approvalOnMax: hi(on), approvalOffMean: mean(off), approvalOffMin: lo(off), approvalOffMax: hi(off),
      approvalTightenOnlyMean: mean(reports.map((r) => r.arms.learning_tighten_only[i]!.ownerApprovalRate)),
      confirmedPer100OnMean: mean(reports.map((r) => r.arms.learning_on[i]!.confirmedPer100Wants)),
      confirmedPer100TightenOnlyMean: mean(reports.map((r) => r.arms.learning_tighten_only[i]!.confirmedPer100Wants)),
      confirmedPer100OffMean: mean(reports.map((r) => r.arms.learning_off[i]!.confirmedPer100Wants)),
      confirmedPer100OracleMean: mean(reports.map((r) => r.arms.oracle_ceiling[i]!.confirmedPer100Wants)),
      confirmedPer100OnRetryMean: mean(reports.map((r) => r.arms.learning_on_retry[i]!.confirmedPer100Wants)),
      confirmedPer100OffRetryMean: mean(reports.map((r) => r.arms.learning_off_retry[i]!.confirmedPer100Wants)),
      approvalOnRetryMean: mean(reports.map((r) => r.arms.learning_on_retry[i]!.ownerApprovalRate)),
      ownerDecisionsPer100OnMean: mean(reports.map((r) => r.arms.learning_on[i]!.ownerDecisionsPer100Wants)),
      ownerDecisionsPer100OnRetryMean: mean(reports.map((r) => r.arms.learning_on_retry[i]!.ownerDecisionsPer100Wants)),
      ownerDecisionsPer100OffMean: mean(reports.map((r) => r.arms.learning_off[i]!.ownerDecisionsPer100Wants)),
      ownerDecisionsPer100OffRetryMean: mean(reports.map((r) => r.arms.learning_off_retry[i]!.ownerDecisionsPer100Wants)),
      ownerDecisionsPer100TightenOnlyMean: mean(reports.map((r) => r.arms.learning_tighten_only[i]!.ownerDecisionsPer100Wants)),
      retryConfirmedOnRetryMean: mean(reports.map((r) => r.arms.learning_on_retry[i]!.retryConfirmed)),
      stretchOffersOnMean: mean(reports.map((r) => r.arms.learning_on[i]!.stretchOffers)),
      stretchAcceptedOnMean: mean(reports.map((r) => r.arms.learning_on[i]!.stretchAccepted)),
      interruptionsOnMean: mean(reports.map((r) => r.arms.learning_on[i]!.interruptionsPerDeal)),
      interruptionsTightenOnlyMean: mean(reports.map((r) => r.arms.learning_tighten_only[i]!.interruptionsPerDeal)),
      stretchConfirmedOnMean: mean(reports.map((r) => r.arms.learning_on[i]!.stretchConfirmed)),
    });
  }
  const from = o.drift ? o.drift.fromRound + 1 : 2;
  const sel = rows.filter((r) => r.round >= from);
  const m = (f: (r: SeedSummaryRow) => number | null) => Math.round((sel.reduce((a, r) => a + (f(r) ?? 0), 0) / Math.max(sel.length, 1)) * 100) / 100;
  const h = { off: m((r) => r.confirmedPer100OffMean), tightenOnly: m((r) => r.confirmedPer100TightenOnlyMean), on: m((r) => r.confirmedPer100OnMean), onRetry: m((r) => r.confirmedPer100OnRetryMean), offRetry: m((r) => r.confirmedPer100OffRetryMean), oracle: m((r) => r.confirmedPer100OracleMean) };
  const pct = (gained: number, gap: number) => (gap > 0 ? Math.round((gained / gap) * 1000) / 10 : null);
  const dpc = (dec: (r: SeedSummaryRow) => number | null, conf: number) => Math.round((m(dec) / Math.max(conf, 0.01)) * 100) / 100;
  const headroom: Headroom = { rounds: sel.map((r) => r.round), ...h, decisionsPerConfirmed: { off: dpc((r) => r.ownerDecisionsPer100OffMean, h.off), tightenOnly: dpc((r) => r.ownerDecisionsPer100TightenOnlyMean, h.tightenOnly), on: dpc((r) => r.ownerDecisionsPer100OnMean, h.on), offRetry: dpc((r) => r.ownerDecisionsPer100OffRetryMean, h.offRetry), onRetry: dpc((r) => r.ownerDecisionsPer100OnRetryMean, h.onRetry) }, retryClosesGapPct: pct(h.onRetry - h.on, h.oracle - h.on), retryAloneClosesGapPct: pct(h.offRetry - h.off, h.oracle - h.off) };
  return { simulated: true, label: SIM_LABEL, seeds: o.seeds, rows, headroom, reports };
}
