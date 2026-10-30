import type { AppConfig } from "@/lib/app-config";
import type { MetaClient } from "@/lib/meta";
import type { Gatekeeper } from "@/features/gatekeeper/public-api/types";
import type { LanguageService } from "@/features/language/public-api/types";
import type { DealEventBus } from "@/hubs/DealEvents/command";
import { createDeal, next, isOpen, IllegalTransitionError, RoundLimitError, createInMemoryDealRepository } from "../../features/deal-state/public-api/infrastructure";
import type { Deal, DealEvent, DealRepository } from "../../features/deal-state/public-api/types";
import { decideTurn, openingOffer, writeNote } from "../../features/negotiator/public-api/infrastructure";
import type { NegotiationMandate, NoteKind } from "../../features/negotiator/public-api/types";
import { buildOfferSchema, noteIsHarmless, termsKey } from "../../features/offers/public-api/infrastructure";
import type { Offer } from "../../features/offers/public-api/types";
import { tracked } from "@/lib/state";

/** What negotiation needs from the catalog; the catalog's item service satisfies it. */
interface ItemOps {
  markInDeal(itemId: string): Promise<unknown>;
  releaseFromDeal(itemId: string): Promise<unknown>;
  reserve(itemId: string, dealId: string): Promise<unknown>;
  /** Handoff finished: the item changed hands. */
  complete?(itemId: string): Promise<unknown>;
  /** Handoff failed: the item goes back on the list. */
  release?(itemId: string): Promise<unknown>;
}

export interface Message {
  dealId: string;
  fromFamilyId: string;
  round: number;
  offer: Offer;
  note: string;
  noteLang: string;
}

/** A message as one owner reads it: the original and, when it is in another language, a translation (LNG-02, NEG-03). */
interface ViewedMessage extends Message {
  translatedNote?: { text: string; language: string; uncertain: boolean };
  translationFailed?: boolean;
}

export class NegotiationError extends Error {
  constructor(
    readonly code: "not_found" | "not_your_turn" | "invalid_offer" | "needs_owner_terms" | "item_unavailable" | "wrong_state" | "not_a_party" | "not_allowed",
    message: string,
  ) {
    super(message);
  }
}

type App = Pick<AppConfig, "id" | "catalog" | "policies">;

export function createNegotiationService(deps: {
  app: App;
  items: ItemOps;
  gatekeeper: Gatekeeper;
  bus: DealEventBus;
  mandateOf: (familyId: string) => NegotiationMandate;
  repo?: DealRepository;
  client?: MetaClient;
  /** Trust gate: may this family start a deal (not banned or restricted)? Defaults to yes. */
  canStartDeal?: (familyId: string) => boolean;
  /** Translates notes for each owner and for the gatekeeper's English check; without it notes are shown as written. */
  language?: LanguageService;
  now?: () => Date;
  newId?: () => string;
}) {
  const repo = deps.repo ?? createInMemoryDealRepository();
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const offerSchema = buildOfferSchema(deps.app);
  const messages = tracked("negotiation.messages", new Map<string, Message[]>());

  const load = async (id: string): Promise<Deal> => {
    const d = await repo.get(id);
    if (!d) throw new NegotiationError("not_found", "deal not found");
    return d;
  };
  const lastMessage = (dealId: string) => messages.get(dealId)?.at(-1);
  const gateFor = (familyId: string, dealId: string) => (topics: string[]) =>
    deps.gatekeeper.evaluateTopics({ familyId, dealId, topics }).outcome;

  async function releaseItems(d: Deal) {
    for (const id of [d.offerItemId, d.wantItemId]) {
      try {
        await deps.items.releaseFromDeal(id);
      } catch {
        /* already free or withdrawn */
      }
    }
  }

  async function apply(d: Deal, event: DealEvent): Promise<Deal> {
    const updated = next(d, event, now());
    await repo.save(updated);
    return updated;
  }

  async function record(d: Deal, fromFamilyId: string, offer: Offer, kind: NoteKind, rawNote?: string) {
    const language = deps.mandateOf(fromFamilyId).language;
    // Our own agent's note goes through the writer; an external note is already screened by the caller.
    const note = rawNote ?? (await writeNote({ client: deps.client, app: deps.app, familyId: fromFamilyId, language, kind, offer }));
    const msg: Message = { dealId: d.id, fromFamilyId, round: d.round, offer: { ...offer, note }, note, noteLang: language };
    messages.set(d.id, [...(messages.get(d.id) ?? []), msg]);
    return msg;
  }

  async function decline(d: Deal, reason: string): Promise<Deal> {
    const out = await apply(d, { type: "agents_decline", reason });
    await releaseItems(out);
    deps.bus.publish({ type: "DealDeclined", dealId: out.id, reason });
    return out;
  }

  const service = {
    /** The wanting owner's agent opens a deal on a match. Both items must be listed; they are held for this deal (NEG-06). */
    async start(match: { offerItemId: string; wantItemId: string; offerFamilyId: string; wantFamilyId: string }): Promise<Deal> {
      if (deps.canStartDeal && !deps.canStartDeal(match.wantFamilyId)) {
        throw new NegotiationError("not_allowed", "this account is restricted and cannot start new deals right now");
      }
      const proposerMandate = deps.mandateOf(match.wantFamilyId);
      const opening = openingOffer(deps.app, proposerMandate, match.offerItemId);
      if (!opening) throw new NegotiationError("needs_owner_terms", "this app needs the owner to say what they offer in return first");
      const parsed = offerSchema.safeParse(opening);
      if (!parsed.success) throw new NegotiationError("invalid_offer", parsed.error.message);

      try {
        await deps.items.markInDeal(match.offerItemId);
      } catch {
        throw new NegotiationError("item_unavailable", "the offered item is not available");
      }
      try {
        await deps.items.markInDeal(match.wantItemId);
      } catch {
        await deps.items.releaseFromDeal(match.offerItemId).catch(() => undefined);
        throw new NegotiationError("item_unavailable", "the wanted item is not available");
      }

      const deal = createDeal({ id: newId(), appId: deps.app.id, ...match, maxRounds: deps.app.policies.maxNegotiationRounds, now: now() });
      // The owner chose these terms themselves when starting the deal, so they count as approved.
      if (parsed.data.terms !== "free") deal.approvedTerms[match.wantFamilyId] = [`terms:${termsKey(parsed.data)}`];
      await repo.insert(deal);
      await record(deal, match.wantFamilyId, parsed.data, "propose");
      return deal;
    },

    /**
     * An offer from an agent (ours or an external one, which is untrusted) is the counter for the family whose turn it is.
     * Notes pass the gatekeeper: one that asks for anything or gives an instruction is dropped, never shown or obeyed.
     */
    async submitOffer(dealId: string, fromFamilyId: string, raw: unknown, rawNote?: string): Promise<Deal> {
      let d = await load(dealId);
      if (d.turnFamilyId !== fromFamilyId) throw new NegotiationError("not_your_turn", "it is not this agent's turn");
      const parsed = offerSchema.safeParse(raw);
      if (!parsed.success) throw new NegotiationError("invalid_offer", parsed.error.issues.map((i) => i.message).join("; "));
      if (parsed.data.itemId !== d.offerItemId) throw new NegotiationError("invalid_offer", "the offer is about a different item");

      let note = "";
      const text = rawNote ?? parsed.data.note;
      if (text) {
        const receiver = d.turnFamilyId === d.offerFamilyId ? d.wantFamilyId : d.offerFamilyId;
        // Check the English translation as well as the original, so a request worded in another language is still caught.
        const english = deps.language ? await deps.language.toEnglish(text, deps.mandateOf(fromFamilyId).language, fromFamilyId) : null;
        const v = deps.gatekeeper.evaluateIncoming({ familyId: receiver, dealId, text, translated: english });
        if (v.outcome === "auto" && noteIsHarmless(deps.app, text) && (english === null || noteIsHarmless(deps.app, english))) note = text;
        else {
          const flag = v.outcome === "forbid" ? "untrusted_instruction" : `note_dropped:${v.decisive.topic}`;
          d = { ...d, flags: [...d.flags, flag] };
        }
      }
      try {
        d = await apply(d, { type: "counter" });
      } catch (e) {
        if (e instanceof RoundLimitError) return decline(d, "round limit reached");
        throw e;
      }
      await record(d, fromFamilyId, parsed.data, "counter", note);
      return d;
    },

    /** Runs one agent turn for whoever is up (NEG-NGT-01..04). Returns the deal after the turn. */
    async takeTurn(dealId: string): Promise<Deal> {
      let d = await load(dealId);
      if (!isOpen(d) || !d.turnFamilyId || d.state === "awaiting_owner_input") return d;
      const me = d.turnFamilyId;
      const last = lastMessage(d.id);
      if (!last) return d;

      const action = decideTurn(deps.app, {
        mandate: deps.mandateOf(me),
        last: last.offer,
        round: d.round,
        maxRounds: d.maxRounds,
        approved: new Set(d.approvedTerms[me] ?? []),
        gate: gateFor(me, d.id),
      });

      switch (action.kind) {
        case "decline":
          return decline(d, action.reason);
        case "ask_owner":
          d = await apply(d, { type: "ask_owner", familyId: me, topic: action.topic, action: { approvalKey: action.approvalKey, then: action.then } });
          deps.bus.publish({ type: "OwnerQuestionOpened", dealId: d.id, familyId: me, topic: action.topic });
          return d;
        case "counter":
          return service.submitOffer(d.id, me, action.offer);
        case "accept": {
          await record(d, me, last.offer, "accept");
          d = await apply(d, { type: "agree" });
          d = await apply(d, { type: "open_cards" });
          deps.bus.publish({ type: "DealAgreedByAgents", dealId: d.id, offerFamilyId: d.offerFamilyId, wantFamilyId: d.wantFamilyId });
          return d;
        }
      }
    },

    /** Alternate turns until the agents agree, someone must ask an owner, or the deal ends. */
    async run(dealId: string, maxSteps = 10): Promise<Deal> {
      let d = await load(dealId);
      for (let i = 0; i < maxSteps && isOpen(d) && d.turnFamilyId && d.state !== "awaiting_owner_input"; i++) d = await service.takeTurn(dealId);
      return d;
    },

    /** The owner answers a paused question. Yes records the approval and the agents carry on; no declines the deal. */
    async answerOwner(dealId: string, familyId: string, proceed: boolean): Promise<Deal> {
      let d = await load(dealId);
      if (d.state !== "awaiting_owner_input" || !d.pending) throw new NegotiationError("wrong_state", "no question is waiting");
      if (d.pending.familyId !== familyId) throw new NegotiationError("not_a_party", "this question is for the other owner");
      const pending = d.pending as { familyId: string; action: { approvalKey: string } };
      d = await apply(d, { type: "owner_answered", proceed });
      if (!proceed) {
        await releaseItems(d);
        deps.bus.publish({ type: "DealDeclined", dealId: d.id, reason: "owner said no" });
        return d;
      }
      d = { ...d, pending: null, approvedTerms: { ...d.approvedTerms, [familyId]: [...(d.approvedTerms[familyId] ?? []), pending.action.approvalKey] } };
      await repo.save(d);
      return service.run(dealId);
    },

    /**
     * Owner confirm or decline on the cards. Confirmed only when both owners confirmed (NEG-STA-04); then both items
     * are reserved for this deal (CAT-03).
     */
    async ownerDecision(dealId: string, familyId: string, decision: "confirm" | "decline"): Promise<Deal> {
      let d = await load(dealId);
      if (familyId !== d.offerFamilyId && familyId !== d.wantFamilyId) throw new NegotiationError("not_a_party", "not an owner in this deal");
      try {
        d = await apply(d, decision === "confirm" ? { type: "owner_confirm", familyId } : { type: "owner_decline", familyId });
      } catch (e) {
        if (e instanceof IllegalTransitionError) throw new NegotiationError("wrong_state", e.message);
        throw e;
      }
      if (d.state === "confirmed") {
        await deps.items.reserve(d.offerItemId, d.id);
        await deps.items.reserve(d.wantItemId, d.id);
        deps.bus.publish({ type: "DealConfirmed", dealId: d.id, offerItemId: d.offerItemId, wantItemId: d.wantItemId });
      } else if (d.state === "declined") {
        await releaseItems(d);
        deps.bus.publish({ type: "DealDeclined", dealId: d.id, reason: "owner declined" });
      }
      return d;
    },

    /** Both owners confirmed and agreed how to hand over: the deal moves to handoff (used by logistics). */
    async startHandoff(dealId: string): Promise<Deal> {
      return apply(await load(dealId), { type: "start_handoff" });
    },

    /** Record how the handoff ended. Items change hands (completed) or go back on the list (not completed). */
    async finishHandoff(dealId: string, ok: boolean): Promise<Deal> {
      const d = await apply(await load(dealId), { type: "handoff_done", ok });
      for (const id of [d.offerItemId, d.wantItemId]) {
        try {
          await (ok ? deps.items.complete?.(id) : deps.items.release?.(id));
        } catch {
          /* already settled */
        }
      }
      return d;
    },

    /** A report was filed: the deal stops, still-held items are freed (reserved ones stay for the operator). Used by relay's report flow. */
    async markReported(dealId: string): Promise<Deal> {
      const d = await apply(await load(dealId), { type: "report" });
      await releaseItems(d);
      return d;
    },

    /** Expire deals nobody answered in time and free their items (NEG-05). Call from a timer. */
    async expireDue(): Promise<string[]> {
      const expired: string[] = [];
      for (const open of await repo.listOpen()) {
        if (new Date(open.expiresAt) > now()) continue;
        const d = await apply(open, { type: "expire" });
        await releaseItems(d);
        deps.bus.publish({ type: "DealExpired", dealId: d.id });
        expired.push(d.id);
      }
      return expired;
    },

    get: (id: string) => repo.get(id),
    /** Every deal the family is a party to, newest first. */
    async listForFamily(familyId: string): Promise<Deal[]> {
      return (await repo.listForFamily(familyId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    transcript: (id: string): Message[] => [...(messages.get(id) ?? [])],

    /** The conversation as `viewerFamilyId` reads it: original notes plus a translation into their language where needed (NEG-03). */
    async transcriptFor(id: string, viewerFamilyId: string): Promise<ViewedMessage[]> {
      const language = deps.mandateOf(viewerFamilyId).language;
      return Promise.all(
        (messages.get(id) ?? []).map(async (m): Promise<ViewedMessage> => {
          if (!m.note || m.noteLang === language || !deps.language) return { ...m };
          const r = await deps.language.translate({ text: m.note, from: m.noteLang, to: language, participantId: viewerFamilyId });
          return r.ok ? { ...m, translatedNote: { text: r.text, language, uncertain: r.uncertain } } : { ...m, translationFailed: true };
        }),
      );
    },

    /** One plain-words line for the owner (NEG-NGT-03). */
    async summary(dealId: string): Promise<string> {
      const d = await load(dealId);
      const line: Record<Deal["state"], string> = {
        proposed: "Your agent has made an offer and is waiting for the other side.",
        countered: `The agents are negotiating (round ${d.round} of ${d.maxRounds}).`,
        agreed_by_agents: "The agents agree. Nothing is final until both owners confirm.",
        awaiting_owner_input: "Your agent needs your answer before it goes on.",
        awaiting_owners: "The agents agree. Waiting for both owners to confirm.",
        confirmed: "Both owners confirmed.",
        declined: "This deal was declined.",
        expired: "This deal expired because it was not answered in time.",
        handoff: "Arranging the handover.",
        completed: "Done: the item changed hands.",
        not_completed: "The handover did not happen.",
        reported: "This deal was reported and is being reviewed.",
      };
      return line[d.state];
    },
  };
  return service;
}

