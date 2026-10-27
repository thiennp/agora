/** Counts from simulated episodes; everything in the benchmark is derived from these (SIM-BEN-01). */
export interface Failure {
  arm: string;
  round: number;
  kind: "owner_declined" | "no_match" | "agents_declined";
  reason?: string;
  role?: "giver" | "receiver";
  /** Synthetic family ids only. */
  familyIds: string[];
  category: string;
}

export interface EpisodeResult {
  wants: number;
  noMatch: number;
  started: number;
  /** Deals where the agents agreed and both owners were asked to confirm. */
  agreed: number;
  decisions: number;
  approvals: number;
  confirmed: number;
  declines: Record<string, number>;
  agentsDeclined: number;
  questions: number;
  /** Stretch cards shown to owners, how many they approved, and how many of those deals both owners confirmed. */
  stretchOffers: number;
  stretchAccepted: number;
  stretchConfirmed: number;
  top3Total: number;
  top3Acceptable: number;
  roundsSum: number;
  crossStarted: number;
  crossConfirmed: number;
  /** Deals confirmed without both owners' confirmations: must be zero. */
  unauthorized: number;
  failures: Failure[];
}

export const emptyResult = (): EpisodeResult => ({
  wants: 0, noMatch: 0, started: 0, agreed: 0, decisions: 0, approvals: 0, confirmed: 0, declines: {}, agentsDeclined: 0, questions: 0, stretchOffers: 0, stretchAccepted: 0, stretchConfirmed: 0,
  top3Total: 0, top3Acceptable: 0, roundsSum: 0, crossStarted: 0, crossConfirmed: 0, unauthorized: 0, failures: [],
});

export function merge(a: EpisodeResult, b: EpisodeResult): EpisodeResult {
  const declines = { ...a.declines };
  for (const [k, v] of Object.entries(b.declines)) declines[k] = (declines[k] ?? 0) + v;
  return {
    wants: a.wants + b.wants, noMatch: a.noMatch + b.noMatch, started: a.started + b.started, agreed: a.agreed + b.agreed,
    decisions: a.decisions + b.decisions, approvals: a.approvals + b.approvals, confirmed: a.confirmed + b.confirmed, declines,
    agentsDeclined: a.agentsDeclined + b.agentsDeclined, questions: a.questions + b.questions, stretchOffers: a.stretchOffers + b.stretchOffers, stretchAccepted: a.stretchAccepted + b.stretchAccepted,
    stretchConfirmed: a.stretchConfirmed + b.stretchConfirmed, top3Total: a.top3Total + b.top3Total,
    top3Acceptable: a.top3Acceptable + b.top3Acceptable, roundsSum: a.roundsSum + b.roundsSum, crossStarted: a.crossStarted + b.crossStarted,
    crossConfirmed: a.crossConfirmed + b.crossConfirmed, unauthorized: a.unauthorized + b.unauthorized, failures: [...a.failures, ...b.failures],
  };
}

const ratio = (n: number, d: number): number | null => (d === 0 ? null : Math.round((n / d) * 1000) / 1000);

export interface RoundMetrics {
  arm: string;
  round: number;
  simulated: true;
  wants: number;
  started: number;
  agreed: number;
  decisions: number;
  approvals: number;
  confirmed: number;
  /** Metric 1: share of owner decisions that were confirms. */
  ownerApprovalRate: number | null;
  /** Share of started deals that both owners confirmed. */
  dealSuccessRate: number | null;
  noMatchRate: number | null;
  /** Deals confirmed by both owners per 100 wants: success that is not flattered by proposing fewer deals. */
  confirmedPer100Wants: number | null;
  /** Metric 2: share of the top 3 candidates that both owners would accept (ground truth from hidden rules). */
  precisionAt3: number | null;
  /** Metric 3. */
  avgRoundsToAgreement: number | null;
  /** Metric 4. */
  crossLanguageSuccessRate: number | null;
  /** Metric 9: owner questions (scheduling questions and stretch cards) per started deal. */
  interruptionsPerDeal: number | null;
  stretchOffers: number;
  stretchAccepted: number;
  stretchConfirmed: number;
  /** Metric 8: must be 0. */
  unauthorizedCommitments: number;
  declinesByReason: Record<string, number>;
  agentsDeclined: number;
  /** Lessons and standing rules in effect at the start of the round (learning arm only). */
  lessons: number;
  standingRules: number;
}

export function summarize(arm: string, round: number, r: EpisodeResult, extra: { lessons: number; standingRules: number }): RoundMetrics {
  return {
    arm, round, simulated: true, wants: r.wants, started: r.started, agreed: r.agreed, decisions: r.decisions, approvals: r.approvals, confirmed: r.confirmed,
    ownerApprovalRate: ratio(r.approvals, r.decisions), dealSuccessRate: ratio(r.confirmed, r.started), noMatchRate: ratio(r.noMatch, r.wants),
    confirmedPer100Wants: r.wants === 0 ? null : Math.round((r.confirmed / r.wants) * 1000) / 10,
    precisionAt3: ratio(r.top3Acceptable, r.top3Total), avgRoundsToAgreement: r.agreed === 0 ? null : Math.round((r.roundsSum / r.agreed) * 100) / 100,
    crossLanguageSuccessRate: ratio(r.crossConfirmed, r.crossStarted), interruptionsPerDeal: r.started === 0 ? null : Math.round(((r.questions + r.stretchOffers) / r.started) * 100) / 100,
    stretchOffers: r.stretchOffers, stretchAccepted: r.stretchAccepted, stretchConfirmed: r.stretchConfirmed,
    unauthorizedCommitments: r.unauthorized, declinesByReason: r.declines, agentsDeclined: r.agentsDeclined, ...extra,
  };
}
