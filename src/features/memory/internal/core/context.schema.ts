/** A reusable lesson about one family's preferences. Built from structured facts only: no names, places or free text. */
export interface Lesson {
  id: string;
  familyId: string;
  kind: "decline" | "accept" | "stretch";
  /** Dedupe key, for example "decline:price:clothing". */
  key: string;
  text: string;
  evidenceDealIds: string[];
  count: number;
  /** 0..1, grows with repeats. */
  confidence: number;
  source: "local" | "agentwitch";
  createdAt: string;
  updatedAt: string;
}

export interface Outcome {
  dealId: string;
  result: "confirmed" | "declined" | "expired" | "completed" | "not_completed";
  reasonCode?: string;
  category?: string;
  at: string;
}

export interface Context {
  familyId: string;
  lessons: Lesson[];
  recentOutcomes: Outcome[];
}
