import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { acceptableToBoth, acceptsStretch, deriveHiddenRules, judge, type HiddenRules } from "./hidden-accept-rules";

const strict: HiddenRules = { maxDistanceKm: 3, minCondition: "good", exactSize: true };

describe("hidden accept rules", () => {
  it("are deterministic for a seed and differ between seeds and styles", async () => {
    const app = await loadApp("kids-gear");
    expect(deriveHiddenRules(app, "f01", "chatty", 1)).toEqual(deriveHiddenRules(app, "f01", "chatty", 1));
    const all = ["generous", "brief", "chatty", "price-sensitive"] as const;
    const maxes = all.map((s) => deriveHiddenRules(app, "f01", s, 1).maxDistanceKm);
    expect(Math.min(...maxes)).toBeLessThan(Math.max(...maxes));
    expect(deriveHiddenRules(app, "f01", "generous", 1).minCondition).toBe("worn");
  });

  it("gives generous owners looser rules than price-sensitive ones", async () => {
    const app = await loadApp("kids-gear");
    for (let seed = 0; seed < 50; seed++) {
      expect(deriveHiddenRules(app, "x", "generous", seed).maxDistanceKm).toBeGreaterThanOrEqual(8);
      expect(deriveHiddenRules(app, "x", "price-sensitive", seed).maxDistanceKm).toBeLessThanOrEqual(5);
    }
  });

  it("judges distance for everyone, condition and size for receivers only, in a fixed order (SIM-OWN-02)", async () => {
    const app = await loadApp("kids-gear");
    const f = { distanceKm: 6, offerCondition: "worn", offerSize: "74", wantSize: "68" };
    expect(judge(app, strict, "giver", f)).toEqual({ confirm: false, reason: "too_far" });
    expect(judge(app, strict, "giver", { ...f, distanceKm: 1 })).toEqual({ confirm: true });
    expect(judge(app, strict, "receiver", { ...f, distanceKm: 1 })).toEqual({ confirm: false, reason: "condition" });
    expect(judge(app, strict, "receiver", { ...f, distanceKm: 1, offerCondition: "good" })).toEqual({ confirm: false, reason: "wrong_size" });
    expect(judge(app, strict, "receiver", { ...f, distanceKm: 1, offerCondition: "good", offerSize: "68" })).toEqual({ confirm: true });
    expect(judge(app, strict, "receiver", { distanceKm: null })).toEqual({ confirm: true });
  });

  it("marks a pair acceptable only when both owners accept", async () => {
    const app = await loadApp("kids-gear");
    const lenient: HiddenRules = { maxDistanceKm: 12, minCondition: "worn", exactSize: false };
    const f = { distanceKm: 6, offerCondition: "worn", offerSize: "74", wantSize: "68" };
    expect(acceptableToBoth(app, lenient, lenient, f)).toBe(true);
    expect(acceptableToBoth(app, strict, lenient, f)).toBe(false);
    expect(acceptableToBoth(app, lenient, strict, { ...f, distanceKm: 1 })).toBe(false);
  });
});

describe("stretch cards", () => {
  it("are judged only on the facts the card shows", async () => {
    const app = await loadApp("kids-gear");
    const rules: HiddenRules = { maxDistanceKm: 9, minCondition: "good", exactSize: true };
    const facts = { distanceKm: 8, offerCondition: "worn", offerSize: "74", wantSize: "68" };
    expect(acceptsStretch(app, rules, ["too_far"], facts)).toBe(true);
    expect(acceptsStretch(app, rules, ["too_far"], { ...facts, distanceKm: 10 })).toBe(false);
    expect(acceptsStretch(app, rules, ["condition"], facts)).toBe(false);
    expect(acceptsStretch(app, rules, ["wrong_size"], facts)).toBe(false);
    expect(acceptsStretch(app, { ...rules, exactSize: false }, ["wrong_size"], facts)).toBe(true);
    expect(acceptsStretch(app, rules, ["too_far", "condition"], facts)).toBe(false);
  });
});
