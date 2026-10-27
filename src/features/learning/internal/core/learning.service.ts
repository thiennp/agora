import type { AppConfig } from "@/lib/app-config";
import type { DealEventBus } from "@/hubs/DealEvents/command";
import type { Lesson, MemoryProvider, Outcome } from "@/features/memory/public-api/types";
import type { NegotiationMandate } from "@/features/negotiation/public-api/types";
import { confidenceFor, deriveAdjustments, levelOf, lessonFromDecision, lessonFromStretch, tighten } from "../../features/lessons/public-api/infrastructure";
import type { Limits, StretchReason } from "../../features/lessons/public-api/types";
import { DEFAULT_THRESHOLD, proposalsFor } from "../../features/standing-rules/public-api/infrastructure";
import type { Answer } from "../../features/standing-rules/public-api/types";

/** Facts about a deal that learning needs; negotiation and catalog provide them. */
export interface DealInfo {
  offerFamilyId: string;
  wantFamilyId: string;
  category?: string;
}

/** What learning needs from owner cards' standing-rule book. */
export interface RuleBook {
  eligibleTopics(): string[];
  activeTopics(familyId: string): string[];
  add(input: { familyId: string; topic: string; days?: number; source?: "owner" | "learned_with_consent" }): unknown;
}

export interface RuleProposal {
  id: string;
  familyId: string;
  topic: string;
  evidenceCount: number;
  /** Plain-words suggestion for the owner; nothing is active until they accept (LRN-STR-02). */
  text: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

/**
 * A match the agent skipped only because of a learned limit, offered to the owner to look at anyway. Nothing starts without the
 * owner's yes (LRN-09). It names no one: the owner sees only why it was skipped.
 */
export interface StretchOffer {
  id: string;
  familyId: string;
  wantItemId: string;
  offerItemId: string;
  counterpartFamilyId: string;
  category: string;
  reasons: StretchReason[];
  text: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface StretchInput {
  wantItemId: string;
  offerItemId: string;
  counterpartFamilyId: string;
  category: string;
  reasons: StretchReason[];
  /** Facts shown to the owner, so they can judge for themselves. */
  shown: { distanceKm?: number | null; usualMaxKm?: number; offerCondition?: string; usualFloor?: string };
}

export class LearningError extends Error {
  constructor(readonly code: "not_found" | "not_owner" | "already_decided" | "too_many_open" | "not_accepted" | "invalid", message: string) {
    super(message);
  }
}

const TOPIC_WORDS: Record<string, string> = { pickup_time_window: "pickup times", size_question: "size questions" };
const MAX_OPEN_STRETCH = 3;
/** After an owner says no to a stretch for a reason, skip this many later opportunities for that reason before asking again. */
const STRETCH_COOLDOWN = 5;
const MAX_ANSWERS = 50;
const MAX_EVIDENCE = 20;

type App = Pick<AppConfig, "catalog">;

export function createLearning(deps: {
  app: App;
  memory: MemoryProvider;
  bus: DealEventBus;
  dealInfo: (dealId: string) => Promise<DealInfo | null>;
  rules: RuleBook;
  onError?: (e: { where: string; message: string }) => void;
  threshold?: number;
  /** After a no to a stretch card, skip this many later opportunities for the same reason. Default 5; 0 asks every time (experiments only). */
  stretchCooldown?: number;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const answers = new Map<string, Answer[]>();
  const proposals = new Map<string, RuleProposal>();
  const dismissed = new Map<string, Set<string>>();
  const stretchOffers = new Map<string, StretchOffer>();
  const stretchDeals = new Map<string, { familyId: string; category: string; reasons: StretchReason[] }>();
  const stretchCooldown = new Map<string, number>();
  // Events are handled one after another, in order: lessons are read-modify-write and must not overwrite each other.
  let tail: Promise<void> = Promise.resolve();

  /** Memory problems are reported, never raised: a memory failure must not block a deal (MEM-04). */
  async function safe<T>(where: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      deps.onError?.({ where, message: (e as Error).message });
      return fallback;
    }
  }

  async function learn(familyId: string, dealId: string, facts: { decision: "confirm" | "decline"; reasonCode?: string; category?: string }) {
    const base = lessonFromDecision(facts);
    if (base) await writeLesson(familyId, dealId, base);
  }

  async function writeLesson(familyId: string, dealId: string, base: { kind: Lesson["kind"]; key: string; text: string }) {
    await safe("learn", async () => {
      const ctx = await deps.memory.getFamilyContext(familyId);
      const existing = ctx.lessons.find((l) => l.key === base.key);
      const t = now().toISOString();
      if (existing) {
        if (existing.evidenceDealIds.includes(dealId)) return; // the same deal never counts twice
        const count = existing.count + 1;
        await deps.memory.recordLesson(familyId, { ...existing, count, confidence: confidenceFor(count), evidenceDealIds: [...existing.evidenceDealIds, dealId].slice(-MAX_EVIDENCE), updatedAt: t });
      } else {
        const lesson: Lesson = { id: newId(), familyId, kind: base.kind, key: base.key, text: base.text, evidenceDealIds: [dealId], count: 1, confidence: confidenceFor(1), source: "local", createdAt: t, updatedAt: t };
        await deps.memory.recordLesson(familyId, lesson);
      }
    }, undefined);
  }

  async function outcome(familyId: string, o: Omit<Outcome, "at">) {
    await safe("outcome", async () => {
      const ctx = await deps.memory.getFamilyContext(familyId);
      if (ctx.recentOutcomes.some((x) => x.dealId === o.dealId && x.result === o.result)) return;
      await deps.memory.recordDealOutcome(familyId, { ...o, at: now().toISOString() });
    }, undefined);
  }

  async function both(dealId: string, result: Outcome["result"], extra: { reasonCode?: string; only?: string } = {}) {
    const info = await deps.dealInfo(dealId);
    if (!info) return;
    for (const f of [info.offerFamilyId, info.wantFamilyId]) {
      await outcome(f, { dealId, result, category: info.category, ...(extra.only === f ? { reasonCode: extra.reasonCode } : {}) });
    }
  }

  function refreshProposals(familyId: string) {
    const gone = dismissed.get(familyId) ?? new Set<string>();
    const open = [...proposals.values()].filter((p) => p.familyId === familyId && p.status === "pending").map((p) => p.topic);
    for (const p of proposalsFor(answers.get(familyId) ?? [], {
      eligible: deps.rules.eligibleTopics(), active: [...deps.rules.activeTopics(familyId), ...open], dismissed: [...gone], threshold: deps.threshold ?? DEFAULT_THRESHOLD,
    })) {
      const id = newId();
      proposals.set(id, {
        id, familyId, topic: p.topic, evidenceCount: p.evidenceCount, status: "pending", createdAt: now().toISOString(),
        text: `You said yes to ${TOPIC_WORDS[p.topic] ?? p.topic.replace(/_/g, " ")} ${p.evidenceCount} times in a row. Make it a standing rule for 30 days so your agent stops asking? You can turn it off any time.`,
      });
    }
  }

  const track = (job: () => Promise<void>) => {
    tail = tail.then(job).catch((e) => deps.onError?.({ where: "event", message: (e as Error).message }));
  };

  deps.bus.subscribe("OwnerDecision", (e) =>
    track(async () => {
      const info = await deps.dealInfo(e.dealId);
      if (!info) return;
      await learn(e.familyId, e.dealId, { decision: e.decision, reasonCode: e.reasonCode, category: info.category });
      if (e.decision === "decline") await both(e.dealId, "declined", { reasonCode: e.reasonCode, only: e.familyId });
    }),
  );
  deps.bus.subscribe("OwnerAnswered", (e) => {
    const list = answers.get(e.familyId) ?? [];
    list.push({ topic: e.topic, answer: e.answer });
    answers.set(e.familyId, list.slice(-MAX_ANSWERS));
    refreshProposals(e.familyId);
  });
  deps.bus.subscribe("DealConfirmed", (e) =>
    track(async () => {
      await both(e.dealId, "confirmed");
      // A stretch deal that both owners confirmed is evidence that the learned limit was too tight for this owner.
      const s = stretchDeals.get(e.dealId);
      if (s) for (const reason of s.reasons) {
        const base = lessonFromStretch({ reason, category: s.category });
        if (base) await writeLesson(s.familyId, e.dealId, base);
      }
    }),
  );
  deps.bus.subscribe("DealDeclined", (e) => track(() => both(e.dealId, "declined")));
  deps.bus.subscribe("DealExpired", (e) => track(() => both(e.dealId, "expired")));
  deps.bus.subscribe("HandoffFinished", (e) => track(() => both(e.dealId, e.ok ? "completed" : "not_completed")));

  const service = {
    /** Wait for work started by events (tests and request handlers call this before reading). */
    async settled() {
      await tail;
    },

    /** "What I learned about you" (LRN-03): plain lessons with how sure they are and how often they were seen. */
    async whatILearned(familyId: string) {
      const ctx = await safe("read", () => deps.memory.getFamilyContext(familyId), { familyId, lessons: [], recentOutcomes: [] });
      return ctx.lessons.map((l) => ({ id: l.id, text: l.text, seenTimes: l.count, level: levelOf(l.confidence) }));
    },

    /** Delete a lesson at any time; it stops affecting behaviour at once because adjustments are derived from stored lessons (LRN-LES-03). */
    async forget(familyId: string, lessonId: string): Promise<boolean> {
      return safe("forget", () => deps.memory.deleteLesson(familyId, lessonId), false);
    },

    /** Owner's limits tightened by confident lessons: never looser than `base` (LRN-02, LRN-04). */
    async limitsFor<T extends Limits>(familyId: string, base: T): Promise<T & Limits> {
      const ctx = await safe("read", () => deps.memory.getFamilyContext(familyId), { familyId, lessons: [], recentOutcomes: [] });
      return { ...base, ...tighten(base, deriveAdjustments(ctx.lessons), deps.app.catalog.conditions) };
    },

    /** The same for the negotiation mandate: only the condition floor can move, and only upwards. */
    async tightenMandate(familyId: string, mandate: NegotiationMandate): Promise<NegotiationMandate> {
      const t = await service.limitsFor(familyId, { minCondition: mandate.minCondition });
      return { ...mandate, minCondition: t.minCondition ?? mandate.minCondition };
    },

    proposalsFor: (familyId: string) => [...proposals.values()].filter((p) => p.familyId === familyId && p.status === "pending"),

    /** Opt-in: only now does a standing rule exist, with an expiry (LRN-STR-02). */
    acceptProposal(familyId: string, id: string, days = 30): void {
      const p = proposals.get(id);
      if (!p) throw new LearningError("not_found", "proposal not found");
      if (p.familyId !== familyId) throw new LearningError("not_owner", "this proposal belongs to someone else");
      if (p.status !== "pending") throw new LearningError("already_decided", `this proposal was already ${p.status}`);
      deps.rules.add({ familyId, topic: p.topic, days, source: "learned_with_consent" });
      p.status = "accepted";
    },
    dismissProposal(familyId: string, id: string): void {
      const p = proposals.get(id);
      if (!p) throw new LearningError("not_found", "proposal not found");
      if (p.familyId !== familyId) throw new LearningError("not_owner", "this proposal belongs to someone else");
      if (p.status !== "pending") throw new LearningError("already_decided", `this proposal was already ${p.status}`);
      p.status = "dismissed";
      dismissed.set(familyId, (dismissed.get(familyId) ?? new Set()).add(p.topic));
    },

    /**
     * The agent found a match that only a learned limit kept out; ask the owner whether to look at it (LRN-09). One offer per pair, at
     * most three waiting at once so owners are not nagged.
     */
    offerStretch(familyId: string, input: StretchInput): StretchOffer | null {
      if (input.reasons.length === 0) throw new LearningError("invalid", "a stretch offer needs at least one learned limit it goes beyond");
      const same = [...stretchOffers.values()].find((o) => o.familyId === familyId && o.offerItemId === input.offerItemId && o.wantItemId === input.wantItemId);
      if (same) return same;
      // Back off after a no (LRN-10): each skipped opportunity uses up one step of the cooldown for the reasons involved.
      const cooling = input.reasons.some((r) => (stretchCooldown.get(`${familyId}:${r}`) ?? 0) > 0);
      if (cooling) {
        for (const r of input.reasons) stretchCooldown.set(`${familyId}:${r}`, Math.max(0, (stretchCooldown.get(`${familyId}:${r}`) ?? 0) - 1));
        return null;
      }
      if ([...stretchOffers.values()].filter((o) => o.familyId === familyId && o.status === "pending").length >= MAX_OPEN_STRETCH) {
        throw new LearningError("too_many_open", "answer the waiting questions first");
      }
      const parts = input.reasons.map((r) => {
        if (r === "too_far") return `it is about ${Math.round(input.shown.distanceKm ?? 0)} km away${input.shown.usualMaxKm ? `, further than the ${Math.round(input.shown.usualMaxKm)} km you usually accept` : ""}`;
        if (r === "condition") return `it is in ${input.shown.offerCondition ?? "lower"} condition${input.shown.usualFloor ? `, below the ${input.shown.usualFloor} you usually want` : ""}`;
        return "its size is not an exact fit";
      });
      const offer: StretchOffer = {
        id: newId(), familyId, wantItemId: input.wantItemId, offerItemId: input.offerItemId, counterpartFamilyId: input.counterpartFamilyId,
        category: input.category, reasons: input.reasons, status: "pending", createdAt: now().toISOString(),
        text: `Your agent skipped a match because ${parts.join(" and ")}. Do you want to look at it anyway? Nothing is agreed until you and the other owner confirm.`,
      };
      stretchOffers.set(offer.id, offer);
      return offer;
    },
    stretchOffersFor: (familyId: string) => [...stretchOffers.values()].filter((o) => o.familyId === familyId && o.status === "pending"),

    /** The owner's answer. Only a yes lets the caller start a deal with this match. */
    answerStretch(familyId: string, id: string, answer: "yes" | "no"): StretchOffer {
      const o = stretchOffers.get(id);
      if (!o) throw new LearningError("not_found", "offer not found");
      if (o.familyId !== familyId) throw new LearningError("not_owner", "this offer belongs to someone else");
      if (o.status !== "pending") throw new LearningError("already_decided", `this offer was already ${o.status}`);
      o.status = answer === "yes" ? "accepted" : "declined";
      for (const r of o.reasons) stretchCooldown.set(`${familyId}:${r}`, answer === "no" ? (deps.stretchCooldown ?? STRETCH_COOLDOWN) : 0);
      return { ...o };
    },

    /** After starting the deal for an accepted offer, link it so that if both owners confirm, the stretch counts as evidence. */
    linkStretchDeal(familyId: string, offerId: string, dealId: string): void {
      const o = stretchOffers.get(offerId);
      if (!o) throw new LearningError("not_found", "offer not found");
      if (o.familyId !== familyId) throw new LearningError("not_owner", "this offer belongs to someone else");
      if (o.status !== "accepted") throw new LearningError("not_accepted", "the owner has not approved this offer");
      stretchDeals.set(dealId, { familyId, category: o.category, reasons: o.reasons });
    },

    async eraseFamily(familyId: string) {
      for (const [id, o] of stretchOffers) if (o.familyId === familyId) stretchOffers.delete(id);
      for (const [d, s] of stretchDeals) if (s.familyId === familyId) stretchDeals.delete(d);
      for (const k of stretchCooldown.keys()) if (k.startsWith(`${familyId}:`)) stretchCooldown.delete(k);
      answers.delete(familyId);
      dismissed.delete(familyId);
      for (const [id, p] of proposals) if (p.familyId === familyId) proposals.delete(id);
      await safe("erase", () => deps.memory.eraseFamily(familyId), undefined);
    },
  };
  return service;
}

export type Learning = ReturnType<typeof createLearning>;
