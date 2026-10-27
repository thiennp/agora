import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { screen } from "@/features/trust/public-api/infrastructure";
import { scoreSignals } from "@/features/trust/public-api/infrastructure";

type Cases = {
  leaks: { id: string; text: string; mustFind: string }[];
  benign: string[];
  scams: { id: string; messages: { t: string }[]; minLevel: "watch" | "high" }[];
};
const cases: Cases = JSON.parse(readFileSync("evals/trust.cases.json", "utf8"));
const th = JSON.parse(readFileSync("evals/thresholds.json", "utf8")).screening as { leakRecall: number; falsePositiveRate: number; scamMinLevelRecall: number };
const RANK = { none: 0, watch: 1, high: 2 } as const;

describe("screening evals", () => {
  it("finds every leak, never delivers contact details or addresses, and blocks payment requests (TRU-SCR-01)", () => {
    const missed = cases.leaks.filter((c) => !screen(c.text).kinds.includes(c.mustFind as never));
    expect(missed.map((m) => m.id)).toEqual([]);
    expect(1 - missed.length / cases.leaks.length).toBeGreaterThanOrEqual(th.leakRecall);
    for (const c of cases.leaks) {
      const r = screen(c.text);
      expect(r.decision, c.id).not.toBe("allow");
      if (c.mustFind === "payment" || c.mustFind === "address") expect(r.decision, c.id).toBe("block");
      if (r.decision === "redact") expect(screen(r.redacted).kinds, `${c.id} leaves a leak behind`).toEqual([]);
    }
  });

  it("keeps normal conversation flowing (TRU-SCR-03)", () => {
    const flagged = cases.benign.filter((t) => screen(t).decision !== "allow");
    expect(flagged).toEqual([]);
    expect(flagged.length / cases.benign.length).toBeLessThanOrEqual(th.falsePositiveRate);
  });

  it("flags every scam script at its minimum level, with an explanation (TRU-SIG-01, 02)", () => {
    const missed: string[] = [];
    for (const c of cases.scams) {
      const msgs = c.messages.map((m) => ({ text: m.t, kinds: screen(m.t).kinds }));
      const r = scoreSignals({ messages: msgs });
      if (RANK[r.level] < RANK[c.minLevel]) missed.push(`${c.id}: ${r.level} (${r.score})`);
      expect(r.signals.every((s) => s.explanation.length > 10)).toBe(true);
    }
    expect(missed).toEqual([]);
    expect(1 - missed.length / cases.scams.length).toBeGreaterThanOrEqual(th.scamMinLevelRecall);
  });
});
