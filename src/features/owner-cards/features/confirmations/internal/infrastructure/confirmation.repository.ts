import type { ConfirmationCard } from "../core/confirmation.schema";
import { tracked } from "@/lib/state";

export function createConfirmationStore() {
  const rows = tracked("cards.confirmations", new Map<string, ConfirmationCard>());
  return {
    rows,
    forFamily: (familyId: string) => [...rows.values()].filter((c) => c.familyId === familyId),
    forDeal: (dealId: string) => [...rows.values()].filter((c) => c.dealId === dealId),
  };
}
export type ConfirmationStore = ReturnType<typeof createConfirmationStore>;
