export interface SuggestedAnswer {
  id: "yes" | "no";
  label: string;
}

export interface OwnerQuestion {
  id: string;
  dealId: string;
  familyId: string;
  topic: string;
  /** Plain-words question built from structured facts only: never counterparty free text (OWN-03). */
  text: string;
  suggestedAnswers: SuggestedAnswer[];
  /** True only for topics that may become a standing rule (never always-ask topics). */
  canRemember: boolean;
  status: "open" | "answered" | "expired";
  answer?: "yes" | "no";
  answeredAt?: string;
  createdAt: string;
  expiresAt: string;
}
