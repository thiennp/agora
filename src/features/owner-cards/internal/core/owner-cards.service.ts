import type { AppConfig } from "@/lib/app-config";
import type { LanguageService } from "@/features/language/public-api/types";
import type { DealEventBus } from "@/hubs/DealEvents/command";
import type { Deal, Message } from "@/features/negotiation/public-api/types";
import { bothConfirmed, REASON_CODES } from "../../features/confirmations/public-api/infrastructure";
import type { ConfirmationCard, ConfirmationStore, ReasonCode } from "../../features/confirmations/public-api/types";
import { createConfirmationStore } from "../../features/confirmations/public-api/infrastructure";
import type { MandateBook } from "../../features/mandates/public-api/types";
import { isEligible } from "../../features/mandates/public-api/infrastructure";
import { createQuestionStore, hasPack, questionContent } from "../../features/questions/public-api/infrastructure";
import type { OwnerQuestion, QuestionStore, TermsFact } from "../../features/questions/public-api/types";
import { tracked } from "@/lib/state";

/** What owner cards need from negotiation; its service satisfies this. */
interface DealOps {
  get(dealId: string): Promise<Deal | null>;
  transcript(dealId: string): Message[];
  answerOwner(dealId: string, familyId: string, proceed: boolean): Promise<Deal>;
  ownerDecision(dealId: string, familyId: string, decision: "confirm" | "decline"): Promise<Deal>;
}

export class OwnerCardError extends Error {
  constructor(readonly code: "not_found" | "not_owner" | "already_decided" | "remember_not_allowed" | "bad_reason", message: string) {
    super(message);
  }
}

interface CardAudit {
  kind: "owner_card";
  action: "question_opened" | "question_answered" | "confirmation_opened" | "confirmation_decided" | "rule_created";
  familyId: string;
  dealId?: string;
  detail?: string;
  at: string;
}

type App = Pick<AppConfig, "policies">;

const termsFact = (m: Message | undefined): TermsFact => {
  const o = m?.offer;
  if (!o) return { kind: "unknown" };
  if (o.terms === "free") return { kind: "free" };
  if (o.terms === "swap") return { kind: "swap", swapFor: o.swapFor ?? "" };
  return { kind: "price", amount: o.price?.amount ?? 0, currency: o.price?.currency ?? "" };
};

export function createOwnerCards(deps: {
  app: App;
  negotiation: DealOps;
  bus: DealEventBus;
  mandates: MandateBook;
  /** The owner's language; cards are worded in it. Defaults to English. */
  languageOf?: (familyId: string) => string;
  /** Translates card text for languages without a fixed wording pack; on failure the English text is kept. */
  language?: LanguageService;
  questions?: QuestionStore;
  confirmations?: ConfirmationStore;
  audit?: (entry: CardAudit) => void;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const questions = deps.questions ?? createQuestionStore();
  const confirmations = deps.confirmations ?? createConfirmationStore();
  const log = (e: Omit<CardAudit, "kind" | "at">) => deps.audit?.({ kind: "owner_card", at: now().toISOString(), ...e });

  // Pending deal reads are async but listeners are sync: cards are created from event data plus a deal snapshot taken by the event's producer.
  const dealSnapshots = tracked("cards.dealSnapshots", new Map<string, Deal>());
  const refresh = async (dealId: string) => {
    const d = await deps.negotiation.get(dealId);
    if (d) dealSnapshots.set(dealId, d);
    return d;
  };

  async function openQuestion(dealId: string, familyId: string, topic: string) {
    const deal = await refresh(dealId);
    if (!deal) return;
    const last = deps.negotiation.transcript(dealId).at(-1);
    const action = deal.pending?.action as { then?: { kind: string; offer?: { pickupWindow?: { from: string; to: string } } } } | undefined;
    const counter = action?.then?.kind === "counter";
    const wanted = deps.languageOf?.(familyId) ?? "en";
    let { text, answers, language } = questionContent(
      { topic, terms: termsFact(last), window: counter ? action?.then?.offer?.pickupWindow : last?.offer.pickupWindow, weAreProposing: counter },
      wanted,
    );
    if (!hasPack(wanted) && wanted !== "en" && deps.language) {
      // No fixed wording: translate the English card; keep the English card if any part fails.
      const [t, ...labels] = await Promise.all([text, ...answers.map((a) => a.label)].map((s) => deps.language!.translate({ text: s, from: "en", to: wanted, participantId: familyId })));
      if (t?.ok && labels.every((l) => l.ok)) {
        text = t.text;
        answers = answers.map((a, i) => ({ ...a, label: (labels[i] as { ok: true; text: string }).text }));
        language = wanted;
      }
    }
    const q: OwnerQuestion = {
      id: newId(), dealId, familyId, topic, language, text, suggestedAnswers: answers,
      canRemember: isEligible(deps.app, topic), status: "open", createdAt: now().toISOString(), expiresAt: deal.expiresAt,
    };
    questions.rows.set(q.id, q);
    log({ action: "question_opened", familyId, dealId, detail: topic });
  }

  function openConfirmations(dealId: string, families: string[]) {
    for (const familyId of families) {
      const c: ConfirmationCard = { id: newId(), dealId, familyId, status: "open", createdAt: now().toISOString() };
      confirmations.rows.set(c.id, c);
      log({ action: "confirmation_opened", familyId, dealId });
    }
  }

  function closeDeal(dealId: string) {
    for (const q of questions.forDeal(dealId)) if (q.status === "open") questions.rows.set(q.id, { ...q, status: "expired" });
    for (const c of confirmations.forDeal(dealId)) if (c.status === "open") confirmations.rows.set(c.id, { ...c, status: "closed" });
  }

  // Cards are made from deal events (hub), never by calling negotiation internals.
  const pendingWork: Promise<void>[] = [];
  deps.bus.subscribe("OwnerQuestionOpened", (e) => void pendingWork.push(openQuestion(e.dealId, e.familyId, e.topic)));
  deps.bus.subscribe("DealAgreedByAgents", (e) => openConfirmations(e.dealId, [e.offerFamilyId, e.wantFamilyId]));
  deps.bus.subscribe("DealDeclined", (e) => closeDeal(e.dealId));
  deps.bus.subscribe("DealExpired", (e) => closeDeal(e.dealId));
  deps.bus.subscribe("DealConfirmed", (e) => {
    for (const c of confirmations.forDeal(e.dealId)) if (c.status === "open") confirmations.rows.set(c.id, { ...c, status: "closed" });
  });

  const ownQuestion = (id: string, familyId: string) => {
    const q = questions.rows.get(id);
    if (!q) throw new OwnerCardError("not_found", "question not found");
    if (q.familyId !== familyId) throw new OwnerCardError("not_owner", "this card belongs to the other owner");
    return q;
  };
  const ownCard = (id: string, familyId: string) => {
    const c = confirmations.rows.get(id);
    if (!c) throw new OwnerCardError("not_found", "card not found");
    if (c.familyId !== familyId) throw new OwnerCardError("not_owner", "this card belongs to the other owner");
    return c;
  };

  return {
    /** Wait for card creation started by events (tests and request handlers call this before reading). */
    async settled() {
      while (pendingWork.length) await pendingWork.shift();
    },

    questionsFor: (familyId: string, status: OwnerQuestion["status"] = "open") => questions.forFamily(familyId).filter((q) => q.status === status),
    confirmationsFor: (familyId: string) => confirmations.forFamily(familyId).filter((c) => c.status === "open"),

    /**
     * One-tap answer. `remember` turns a yes into a standing rule, only for topics that may become one; it is validated
     * before anything changes, so a refused rule never half-applies the answer.
     */
    async answerQuestion(id: string, familyId: string, answer: "yes" | "no", opts?: { remember?: { days?: number } }): Promise<Deal> {
      const q = ownQuestion(id, familyId);
      if (q.status !== "open") throw new OwnerCardError("already_decided", `this question is ${q.status}`);
      if (opts?.remember && (!q.canRemember || answer !== "yes")) {
        throw new OwnerCardError("remember_not_allowed", "this kind of decision can never become a standing rule");
      }
      questions.rows.set(id, { ...q, status: "answered", answer, answeredAt: now().toISOString() });
      log({ action: "question_answered", familyId, dealId: q.dealId, detail: `${q.topic}:${answer}` });
      deps.bus.publish({ type: "OwnerAnswered", dealId: q.dealId, familyId, topic: q.topic, answer });
      if (opts?.remember) {
        deps.mandates.add({ familyId, topic: q.topic, days: opts.remember.days });
        log({ action: "rule_created", familyId, dealId: q.dealId, detail: q.topic });
      }
      try {
        const deal = await deps.negotiation.answerOwner(q.dealId, familyId, answer === "yes");
        await this.settled();
        return deal;
      } catch (e) {
        // Negotiation refused (for example the deal ended meanwhile): reopen the card so nothing is silently lost.
        questions.rows.set(id, q);
        throw e;
      }
    },

    /** Confirm or decline with a reason (OWN-CNF-01). Confirmed only when both owners confirm. */
    async decide(cardId: string, familyId: string, decision: "confirm" | "decline", reason?: { code: ReasonCode; text?: string }): Promise<Deal> {
      const c = ownCard(cardId, familyId);
      if (c.status !== "open") throw new OwnerCardError("already_decided", `this card is ${c.status}`);
      if (reason && !REASON_CODES.includes(reason.code)) throw new OwnerCardError("bad_reason", "unknown reason");
      const deal = await deps.negotiation.ownerDecision(c.dealId, familyId, decision);
      confirmations.rows.set(cardId, {
        ...c, status: decision === "confirm" ? "confirmed" : "declined", decidedAt: now().toISOString(),
        reasonCode: reason?.code, reasonText: reason?.text?.slice(0, 280),
      });
      log({ action: "confirmation_decided", familyId, dealId: c.dealId, detail: `${decision}${reason ? `:${reason.code}` : ""}` });
      deps.bus.publish({ type: "OwnerDecision", dealId: c.dealId, familyId, decision, reasonCode: reason?.code });
      return deal;
    },

    /** True when both owners' cards are confirmed (mirrors the deal state; used by the UI). */
    isFullyConfirmed(dealId: string, owners: readonly [string, string]) {
      return bothConfirmed(confirmations.forDeal(dealId), owners);
    },

    /** Interruptions per deal (OWN-MND-04): how often owners had to be asked. */
    interruptions() {
      const perDeal = new Map<string, number>();
      for (const q of questions.rows.values()) perDeal.set(q.dealId, (perDeal.get(q.dealId) ?? 0) + 1);
      const deals = perDeal.size;
      const total = [...perDeal.values()].reduce((a, b) => a + b, 0);
      return { deals, questions: total, perDeal: deals ? total / deals : 0 };
    },

    /** Owner erasure (FAM-03): cards and rules of that family go. */
    eraseFamily(familyId: string) {
      for (const q of questions.forFamily(familyId)) questions.rows.delete(q.id);
      for (const c of confirmations.forFamily(familyId)) confirmations.rows.delete(c.id);
      deps.mandates.eraseFamily(familyId);
    },

    mandates: deps.mandates,
  };
}

