import type { Offer } from "./offer.schema";

/** A stable key for the money/terms part of an offer, so "the owner approved these terms" can be remembered per deal. */
export function termsKey(o: Pick<Offer, "terms" | "price" | "swapFor" | "condition">): string {
  return JSON.stringify([o.terms, o.price?.amount ?? null, o.price?.currency ?? null, o.swapFor?.trim().toLowerCase() ?? null, o.condition ?? null]);
}

/**
 * Gatekeeper topics raised by changing from `prev` to `next` (NEG-OFR-02): any change of terms, price, swap or
 * condition is a price_terms matter; a change of pickup window is a pickup_time_window matter.
 */
export function changeTopics(prev: Offer | null, next: Offer): string[] {
  if (!prev) return next.terms === "free" ? [] : ["price_terms"];
  const topics: string[] = [];
  if (termsKey(prev) !== termsKey(next)) topics.push("price_terms");
  if (JSON.stringify(prev.pickupWindow ?? null) !== JSON.stringify(next.pickupWindow ?? null)) topics.push("pickup_time_window");
  return topics;
}
