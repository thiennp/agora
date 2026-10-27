import type { ConfirmationCard } from "./confirmation.schema";

/** True only when every owner in the deal has a confirmed card (OWN-CNF-02). Negotiation enforces the same rule on the deal itself. */
export function bothConfirmed(cards: readonly Pick<ConfirmationCard, "familyId" | "status">[], owners: readonly [string, string]): boolean {
  return owners.every((o) => cards.some((c) => c.familyId === o && c.status === "confirmed"));
}
