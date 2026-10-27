export const REASON_CODES = ["too_far", "wrong_size", "condition", "price", "timing", "other"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface DecisionFacts {
  decision: "confirm" | "decline";
  reasonCode?: string;
  category?: string;
}

const WHY: Record<ReasonCode, string> = {
  too_far: "it was too far away",
  wrong_size: "the size was wrong",
  condition: "the condition was not good enough",
  price: "of the terms",
  timing: "the timing did not work",
  other: "of another reason",
};

/**
 * A lesson from one decision, built only from structured facts (reason code and category). Free text the owner typed is never
 * used, so a lesson can hold no names, places or contact details and can safely be mirrored (LRN-LES-01).
 * Returns null when there is nothing to learn (a decline without a known reason).
 */
export function lessonFromDecision(f: DecisionFacts): { kind: "decline" | "accept"; key: string; text: string } | null {
  const cat = f.category ?? "any";
  const label = f.category ? `${f.category} ` : "";
  if (f.decision === "confirm") return { kind: "accept", key: `accept:${cat}`, text: `Confirmed ${label}deals.` };
  const reason = REASON_CODES.find((r) => r === f.reasonCode);
  if (!reason) return null;
  return { kind: "decline", key: `decline:${reason}:${cat}`, text: `Declined ${label}deals because ${WHY[reason]}.` };
}
