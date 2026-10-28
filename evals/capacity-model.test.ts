import { describe, expect, it } from "vitest";
import { capacity, costPerCallUsd, DEFAULTS, markdownTables } from "./capacity-model";

/** The figures quoted in docs/SCALE.md. If an assumption or a price changes, update the doc together with this test. */
describe("capacity model (docs/SCALE.md)", () => {
  it("scales traffic linearly with members", () => {
    const m100 = capacity(100_000_000);
    expect(m100.modelCallsPerMonth).toBe(3_600_000_000);
    expect(Math.round(m100.modelCallsPerSecAvg)).toBe(1389);
    expect(Math.round(m100.modelCallsPerSecPeak)).toBe(13_889);
    expect(capacity(1_000_000_000).modelCallsPerMonth).toBe(10 * m100.modelCallsPerMonth);
  });

  it("prices a call from the same table the cost meter uses", () => {
    expect(costPerCallUsd("muse-spark", DEFAULTS)).toBeCloseTo(0.00185, 6);
    expect(costPerCallUsd("muse-spark-open", DEFAULTS)).toBeCloseTo(0.00024, 6);
  });

  it("shows the order of magnitude of each cost lever at 100 million members", () => {
    const c = capacity(100_000_000);
    expect(c.costAllLargeUsd / 1e6).toBeCloseTo(6.66, 1);
    expect(c.costMixedUsd / 1e6).toBeCloseTo(2.02, 1);
    expect(c.costMixedAvoidedUsd / 1e3).toBeCloseTo(607, 0);
    expect(c.costPerMemberMixedAvoidedUsd).toBeCloseTo(0.0061, 4);
  });

  it("needs about ten matching shards at 100 million members and about a hundred at one billion", () => {
    expect(capacity(100_000_000).matchingShards).toBe(10);
    expect(capacity(1_000_000_000).matchingShards).toBe(98);
    expect(capacity(1_000_000).matchingShards).toBe(1);
  });

  it("prints the tables the doc embeds", () => {
    const md = markdownTables([1e8]);
    expect(md).toContain("| 100,000,000 | 300,000,000 | 3,600,000,000 | 1,389 → 13,889 |");
  });
});
