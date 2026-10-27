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

const SHORT: Record<ReasonCode, string> = {
  too_far: "distance",
  wrong_size: "size",
  condition: "condition",
  price: "terms",
  timing: "timing",
  other: "other matters",
};

/**
 * A lesson that the owner was happy to look beyond a learned limit and then confirmed the deal (the owner approved the stretch and
 * the deal). It counts against the matching "decline" lesson and so loosens that limit one step. Structured facts only.
 */
export function lessonFromStretch(f: { reason: string; category?: string }): { kind: "stretch"; key: string; text: string } | null {
  const reason = REASON_CODES.find((r) => r === f.reason);
  if (!reason) return null;
  const cat = f.category ?? "any";
  return { kind: "stretch", key: `stretch:${reason}:${cat}`, text: `Was happy to look beyond the usual ${SHORT[reason]} limit for ${f.category ? `${f.category} ` : ""}deals.` };
}

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
