import { tracked } from "@/lib/state";
export interface MandateRecord {
  id: string;
  familyId: string;
  topic: string;
  expiresAt: string;
  source: "owner" | "learned_with_consent";
  createdAt: string;
}

export interface OwnerLimits {
  maxDistanceKm?: number;
  blockedCategories: string[];
  availability: { from: string; to: string }[];
  minCondition?: string;
  allowedTerms: ("free" | "swap" | "price")[];
}

/** Synchronous in-memory stores: card creation reacts to events in the same tick. A database version moves that to a worker. */
export function createMandateStore() {
  const mandates = tracked("cards.mandates", new Map<string, MandateRecord>());
  const limits = tracked("cards.limits", new Map<string, OwnerLimits>());
  return {
    mandates,
    limits,
    forFamily: (familyId: string) => [...mandates.values()].filter((m) => m.familyId === familyId),
  };
}
export type MandateStore = ReturnType<typeof createMandateStore>;
