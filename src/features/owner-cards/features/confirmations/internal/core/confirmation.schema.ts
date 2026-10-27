export const REASON_CODES = ["too_far", "wrong_size", "condition", "price", "timing", "other"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface ConfirmationCard {
  id: string;
  dealId: string;
  familyId: string;
  status: "open" | "confirmed" | "declined" | "closed";
  decidedAt?: string;
  reasonCode?: ReasonCode;
  reasonText?: string;
  createdAt: string;
}
