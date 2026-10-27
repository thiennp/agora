export type ReputationEvent =
  | { type: "deal_completed" }
  | { type: "report_filed_against" }
  | { type: "scam_signals"; level: "watch" | "high" }
  | { type: "cancellation"; totalCancellations: number };

export interface ScoreChange {
  delta: number;
  reason: string;
  at: string;
}

export interface AgentStatus {
  familyId: string;
  score: number;
  history: ScoreChange[];
  banned: boolean;
}

/** Documented thresholds (TRU-REP-02). */
export const THRESHOLDS = { start: 80, good: 70, restricted: 50, banned: 25, minNegativeEventsToBan: 3 } as const;

export type Indicator = "good" | "caution" | "restricted";

const DELTAS = { deal_completed: 5, report_filed_against: -15, watch: -3, high: -10, cancellationBeyondTwo: -3 } as const;

/** Explainable change for one event, or null when the event changes nothing (TRU-REP-01). */
export function changeFor(e: ReputationEvent): { delta: number; reason: string } | null {
  switch (e.type) {
    case "deal_completed":
      return { delta: DELTAS.deal_completed, reason: "completed a deal" };
    case "report_filed_against":
      return { delta: DELTAS.report_filed_against, reason: "reported by another owner" };
    case "scam_signals":
      return e.level === "high" ? { delta: DELTAS.high, reason: "strong scam signals in a conversation" } : { delta: DELTAS.watch, reason: "mild scam signals in a conversation" };
    case "cancellation":
      return e.totalCancellations > 2 ? { delta: DELTAS.cancellationBeyondTwo, reason: `cancelled after agreeing (${e.totalCancellations} so far)` } : null;
  }
}

export const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Three-level indicator for owners, never the raw score (TRU-REP-03). Banned agents show as restricted. */
export function indicatorFor(s: Pick<AgentStatus, "score" | "banned">): Indicator {
  if (s.banned || s.score < THRESHOLDS.restricted) return "restricted";
  return s.score >= THRESHOLDS.good ? "good" : "caution";
}

/** A ban needs a low score and a pattern: several separate negative events, never one weak signal (TRU-SIG-03). */
export function shouldBan(s: Pick<AgentStatus, "score" | "history">): boolean {
  const negatives = s.history.filter((h) => h.delta < 0).length;
  return s.score < THRESHOLDS.banned && negatives >= THRESHOLDS.minNegativeEventsToBan;
}
