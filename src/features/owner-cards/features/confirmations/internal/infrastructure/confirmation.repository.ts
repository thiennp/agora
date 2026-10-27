import type { ConfirmationCard } from "../core/confirmation.schema";

export function createConfirmationStore() {
  const rows = new Map<string, ConfirmationCard>();
  return {
    rows,
    forFamily: (familyId: string) => [...rows.values()].filter((c) => c.familyId === familyId),
    forDeal: (dealId: string) => [...rows.values()].filter((c) => c.dealId === dealId),
  };
}
export type ConfirmationStore = ReturnType<typeof createConfirmationStore>;
