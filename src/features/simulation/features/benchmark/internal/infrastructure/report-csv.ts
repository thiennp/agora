import type { BenchmarkReport } from "./run-benchmark";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: unknown[]) => cells.map(esc).join(",");

/** CSV files for the dashboard and for sharing (SIM-BEN-03). Every row carries `simulated=true` (SIM-05). */
export function toCsv(report: BenchmarkReport): { perRound: string; comparison: string; failures: string } {
  const reasons = ["too_far", "condition", "wrong_size"];
  const head = ["simulated", "arm", "round", "wants", "started", "agreed", "decisions", "approvals", "confirmed", "owner_approval_rate", "deal_success_rate", "no_match_rate", "confirmed_per_100_wants", "precision_at_3", "avg_rounds_to_agreement", "cross_language_success_rate", "interruptions_per_deal", "stretch_offers", "stretch_accepted", "stretch_confirmed", "unauthorized_commitments", ...reasons.map((r) => `declined_${r}`), "agents_declined", "lessons", "standing_rules"];
  const perRound = [row(head)];
  for (const arm of ["learning_on", "learning_tighten_only", "learning_off", "oracle_ceiling"] as const) {
    for (const m of report.arms[arm]) {
      perRound.push(row([true, m.arm, m.round, m.wants, m.started, m.agreed, m.decisions, m.approvals, m.confirmed, m.ownerApprovalRate, m.dealSuccessRate, m.noMatchRate, m.confirmedPer100Wants, m.precisionAt3, m.avgRoundsToAgreement, m.crossLanguageSuccessRate, m.interruptionsPerDeal, m.stretchOffers, m.stretchAccepted, m.stretchConfirmed, m.unauthorizedCommitments, ...reasons.map((r) => m.declinesByReason[r] ?? 0), m.agentsDeclined, m.lessons, m.standingRules]));
    }
  }
  const comparison = [row(["simulated", "round", "approval_rate_learning_on", "approval_rate_learning_tighten_only", "approval_rate_learning_off", "delta_on_vs_off", "confirmed_per_100_wants_on", "confirmed_per_100_wants_tighten_only", "confirmed_per_100_wants_off", "confirmed_per_100_wants_oracle_ceiling"]), ...report.comparison.map((c) => row([true, c.round, c.on, c.tightenOnly, c.off, c.delta, c.confirmedPer100On, c.confirmedPer100TightenOnly, c.confirmedPer100Off, c.confirmedPer100Oracle]))];
  const failures = [row(["simulated", "arm", "round", "kind", "reason", "role", "category", "family_ids"]), ...report.failures.map((f) => row([true, f.arm, f.round, f.kind, f.reason, f.role, f.category, f.familyIds.join(" ")]))];
  return { perRound: perRound.join("\n") + "\n", comparison: comparison.join("\n") + "\n", failures: failures.join("\n") + "\n" };
}
