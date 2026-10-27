import { describe, expect, it } from "vitest";
import { emptyResult, merge, summarize, type EpisodeResult } from "./metrics";

const r = (over: Partial<EpisodeResult>): EpisodeResult => ({ ...emptyResult(), ...over });

describe("benchmark metrics", () => {
  it("computes the plan's metrics from counts", () => {
    const m = summarize("learning_on", 3, r({
      wants: 20, noMatch: 5, started: 15, agreed: 10, decisions: 14, approvals: 9, confirmed: 6, top3Total: 30, top3Acceptable: 12, roundsSum: 15,
      crossStarted: 8, crossConfirmed: 2, questions: 3, declines: { too_far: 4, condition: 1 }, agentsDeclined: 5,
    }), { lessons: 7, standingRules: 2 });
    expect(m).toMatchObject({ simulated: true, ownerApprovalRate: 0.643, dealSuccessRate: 0.4, noMatchRate: 0.25, confirmedPer100Wants: 30, precisionAt3: 0.4, avgRoundsToAgreement: 1.5, crossLanguageSuccessRate: 0.25, interruptionsPerDeal: 0.2, unauthorizedCommitments: 0, lessons: 7, standingRules: 2 });
    expect(m.declinesByReason).toEqual({ too_far: 4, condition: 1 });
  });

  it("reports null instead of dividing by zero", () => {
    const m = summarize("learning_off", 1, emptyResult(), { lessons: 0, standingRules: 0 });
    expect([m.ownerApprovalRate, m.dealSuccessRate, m.noMatchRate, m.confirmedPer100Wants, m.precisionAt3, m.avgRoundsToAgreement, m.crossLanguageSuccessRate, m.interruptionsPerDeal]).toEqual(Array(8).fill(null));
  });

  it("merges episodes by adding counts and keeping every failure (SIM-04)", () => {
    const f = { arm: "a", round: 1, kind: "no_match" as const, familyIds: ["f1"], category: "toys" };
    const total = merge(r({ wants: 2, declines: { too_far: 1 }, failures: [f] }), r({ wants: 3, declines: { too_far: 2, condition: 1 }, failures: [f, f] }));
    expect(total.wants).toBe(5);
    expect(total.declines).toEqual({ too_far: 3, condition: 1 });
    expect(total.failures).toHaveLength(3);
  });
});
