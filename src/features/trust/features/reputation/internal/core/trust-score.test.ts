import { describe, expect, it } from "vitest";
import { createReputation } from "../infrastructure/agent-status.repository";
import { changeFor, indicatorFor } from "./trust-score";

describe("reputation", () => {
  it("explains every change and starts at 80", () => {
    const rep = createReputation({ now: () => new Date("2026-10-27T12:00:00Z") });
    expect(rep.status("a").score).toBe(80);
    const s = rep.record("a", { type: "report_filed_against" });
    expect(s.score).toBe(65);
    expect(s.history).toEqual([{ delta: -15, reason: "reported by another owner", at: "2026-10-27T12:00:00.000Z" }]);
    expect(changeFor({ type: "cancellation", totalCancellations: 2 })).toBeNull();
    expect(rep.record("a", { type: "deal_completed" }).score).toBe(70);
    expect(rep.record("b", { type: "deal_completed" }).score).toBe(85);
  });

  it("maps scores to three levels, never exposing the number", () => {
    expect(indicatorFor({ score: 90, banned: false })).toBe("good");
    expect(indicatorFor({ score: 60, banned: false })).toBe("caution");
    expect(indicatorFor({ score: 40, banned: false })).toBe("restricted");
    expect(indicatorFor({ score: 99, banned: true })).toBe("restricted");
  });

  it("restricts below 50, and bans only after a pattern of several negative events (TRU-SIG-03)", () => {
    const rep = createReputation();
    rep.record("x", { type: "report_filed_against" });
    rep.record("x", { type: "report_filed_against" });
    expect(rep.status("x")).toMatchObject({ score: 50, banned: false });
    expect(rep.canStartDeal("x")).toBe(true);
    rep.record("x", { type: "scam_signals", level: "high" });
    expect(rep.canStartDeal("x")).toBe(false);
    expect(rep.canRelay("x")).toBe(true);
    for (let i = 0; i < 2; i++) rep.record("x", { type: "report_filed_against" });
    expect(rep.status("x").banned).toBe(true);
    expect(rep.canRelay("x")).toBe(false);
    // one big hit never bans
    const one = createReputation();
    one.record("y", { type: "report_filed_against" });
    expect(one.status("y").banned).toBe(false);
  });

  it("caps the score at 100 and floors it at 0", () => {
    const rep = createReputation();
    for (let i = 0; i < 10; i++) rep.record("a", { type: "deal_completed" });
    expect(rep.status("a").score).toBe(100);
    for (let i = 0; i < 20; i++) rep.record("b", { type: "report_filed_against" });
    expect(rep.status("b").score).toBe(0);
  });
});
