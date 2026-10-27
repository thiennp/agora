import type { AppConfig } from "@/lib/app-config";
import type { Outcome } from "@/features/gatekeeper/public-api/types";
import { changeTopics, termsKey } from "../../../offers/public-api/infrastructure";
import type { Offer, Terms } from "../../../offers/public-api/types";

/** What one owner has authorised their agent to do in a deal (NEG-NGT-01). */
export interface NegotiationMandate {
  /** Terms the owner is willing to consider; anything else is declined. */
  allowedTerms: Terms[];
  /** Worst condition the owner accepts. */
  minCondition?: string;
  /** Windows the owner is free to meet. Empty means no constraint. */
  availability: { from: string; to: string }[];
  language: string;
  /** Terms the owner chose themselves when starting the deal; used for the opening offer. */
  opening?: Pick<Offer, "terms" | "price" | "swapFor">;
}

export type TurnAction =
  | { kind: "accept" }
  | { kind: "counter"; offer: Offer }
  | { kind: "decline"; reason: string }
  | { kind: "ask_owner"; topic: string; approvalKey: string; then: { kind: "accept" } | { kind: "counter"; offer: Offer } };

type App = Pick<AppConfig, "catalog" | "policies">;

const within = (w: { from: string; to: string }, a: { from: string; to: string }) =>
  new Date(w.from) >= new Date(a.from) && new Date(w.to) <= new Date(a.to);

/**
 * The agent's decision for one turn, as a pure function (NEG-NGT-01, 02, 04). The gatekeeper has the last word on
 * every topic: `gate` returns its outcome, and anything but auto becomes a question for the owner. Facts that are not
 * in the offer are never added.
 */
export function decideTurn(
  app: App,
  input: {
    mandate: NegotiationMandate;
    last: Offer;
    round: number;
    maxRounds: number;
    /** Approval keys the owner already gave in this deal. */
    approved: ReadonlySet<string>;
    gate: (topics: string[]) => Outcome;
  },
): TurnAction {
  const { mandate, last, approved, gate } = input;

  if (mandate.minCondition && last.condition) {
    const order = app.catalog.conditions;
    if (order.indexOf(last.condition) > order.indexOf(mandate.minCondition)) return { kind: "decline", reason: "condition is below the owner's minimum" };
  }
  if (!mandate.allowedTerms.includes(last.terms)) return { kind: "decline", reason: "terms are not ones the owner will consider" };

  // Money or swap terms are the owner's call, whoever proposed them, unless the owner already approved these exact terms.
  const termsApproval = `terms:${termsKey(last)}`;
  if (last.terms !== "free" && !approved.has(termsApproval)) {
    const topics = changeTopics(null, last);
    if (gate(topics) !== "auto") return { kind: "ask_owner", topic: "price_terms", approvalKey: termsApproval, then: { kind: "accept" } };
  }

  // Scheduling: stay inside the owner's availability.
  if (mandate.availability.length > 0) {
    const ok = last.pickupWindow && mandate.availability.some((a) => within(last.pickupWindow!, a));
    if (!ok) {
      const ours = mandate.availability[0]!;
      const counter: Offer = { ...last, pickupWindow: { from: ours.from, to: ours.to }, note: "" };
      if (input.round >= input.maxRounds) return { kind: "decline", reason: "no agreed time within the round limit" };
      const approvalKey = `window:${JSON.stringify(counter.pickupWindow)}`;
      if (!approved.has(approvalKey) && gate(["pickup_time_window"]) !== "auto") {
        return { kind: "ask_owner", topic: "pickup_time_window", approvalKey, then: { kind: "counter", offer: counter } };
      }
      return { kind: "counter", offer: counter };
    }
  }
  // Agreement between agents is not a commitment: it only opens confirm cards for both owners.
  return { kind: "accept" };
}

/** The first offer for the owner who starts a deal, or null when the owner must supply terms first. */
export function openingOffer(app: App, mandate: NegotiationMandate, itemId: string): Offer | null {
  const base = { itemId, note: "" };
  if (mandate.opening) return { ...base, ...mandate.opening, ...(mandate.minCondition ? { condition: mandate.minCondition } : {}) } as Offer;
  if (mandate.allowedTerms.includes("free") && app.policies.pricing.mode !== "swap_only") {
    return { ...base, terms: "free", ...(mandate.minCondition ? { condition: mandate.minCondition } : {}) } as Offer;
  }
  return null;
}
