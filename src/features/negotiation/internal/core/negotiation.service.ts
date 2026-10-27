import type { AppConfig } from "@/lib/app-config";
import type { MetaClient } from "@/lib/meta";
import type { Gatekeeper } from "@/features/gatekeeper/public-api/types";
import type { DealEventBus } from "@/hubs/DealEvents/command";
import { createDeal, next, isOpen, IllegalTransitionError, RoundLimitError, createInMemoryDealRepository } from "../../features/deal-state/public-api/infrastructure";
import type { Deal, DealEvent, DealRepository } from "../../features/deal-state/public-api/types";
import { decideTurn, openingOffer, writeNote } from "../../features/negotiator/public-api/infrastructure";
import type { NegotiationMandate, NoteKind } from "../../features/negotiator/public-api/types";
import { buildOfferSchema, noteIsHarmless, termsKey } from "../../features/offers/public-api/infrastructure";
import type { Offer } from "../../features/offers/public-api/types";

/** What negotiation needs from the catalog; the catalog's item service satisfies it. */
export interface ItemOps {
  markInDeal(itemId: string): Promise<unknown>;
  releaseFromDeal(itemId: string): Promise<unknown>;
  reserve(itemId: string, dealId: string): Promise<unknown>;
}

export interface Message {
  dealId: string;
  fromFamilyId: string;
  round: number;
  offer: Offer;
  note: string;
  noteLang: string;
}

export class NegotiationError extends Error {
  constructor(
    readonly code: "not_found" | "not_your_turn" | "invalid_offer" | "needs_owner_terms" | "item_unavailable" | "wrong_state" | "not_a_party",
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
  now?: () => Date;
  newId?: () => string;
}) {
  const repo = deps.repo ?? createInMemoryDealRepository();
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const offerSchema = buildOfferSchema(deps.app);
  const messages = new Map<string, Message[]>();

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

      let deal = createDeal({ id: newId(), appId: deps.app.id, ...match, maxRounds: deps.app.policies.maxNegotiationRounds, now: now() });
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
        const v = deps.gatekeeper.evaluateIncoming({ familyId: d.turnFamilyId === d.offerFamilyId ? d.wantFamilyId : d.offerFamilyId, dealId, text });
        if (v.outcome === "auto" && noteIsHarmless(deps.app, text)) note = text;
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
    transcript: (id: string): Message[] => [...(messages.get(id) ?? [])],

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

export type NegotiationService = ReturnType<typeof createNegotiationService>;
