import { describe, expect, it } from "vitest";
import { deriveAdjustments, tighten } from "./adjustments";
import { lessonFromDecision } from "./lesson.schema";
import type { Lesson } from "../../../../../memory/public-api/types";

const CONDITIONS = ["new", "like-new", "good", "worn"];
const lesson = (key: string, count: number, kind: Lesson["kind"] = "decline"): Lesson => ({
  id: key, familyId: "f", kind, key, text: key, evidenceDealIds: [], count, confidence: 1 - 0.5 ** count, source: "local", createdAt: "", updatedAt: "",
});

describe("lessons from decisions", () => {
  it("builds lessons from reason code and category only, never from free text (LRN-LES-01)", () => {
    expect(lessonFromDecision({ decision: "decline", reasonCode: "too_far", category: "clothing" })).toEqual({ kind: "decline", key: "decline:too_far:clothing", text: "Declined clothing deals because it was too far away." });
    expect(lessonFromDecision({ decision: "confirm", category: "toys" })).toEqual({ kind: "accept", key: "accept:toys", text: "Confirmed toys deals." });
    expect(lessonFromDecision({ decision: "decline", reasonCode: "my address is 12 Oak Street" })).toBeNull();
    expect(lessonFromDecision({ decision: "decline" })).toBeNull();
    expect(JSON.stringify(lessonFromDecision({ decision: "decline", reasonCode: "other", category: "toys" }))).not.toMatch(/\d/);
  });
});

describe("adjustments", () => {
  it("act only from the second sighting and ignore accepts", () => {
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 1)])).toEqual({ strictSizeCategories: [] });
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 2)])).toMatchObject({ distanceFactor: 0.7 });
    expect(deriveAdjustments([lesson("accept:clothing", 5, "accept")])).toEqual({ strictSizeCategories: [] });
    expect(deriveAdjustments([lesson("decline:wrong_size:clothing", 2), lesson("decline:wrong_size:toys", 3), lesson("decline:wrong_size:any", 3)]).strictSizeCategories.sort()).toEqual(["clothing", "toys"]);
    expect(deriveAdjustments([lesson("decline:price:clothing", 9), lesson("decline:timing:clothing", 9), lesson("decline:other:clothing", 9)])).toEqual({ strictSizeCategories: [] });
  });

  it("tightens distance (default cap 10 km, floor 1 km) and raises the condition floor one step", () => {
    const adj = { distanceFactor: 0.7, raiseConditionFloor: true, strictSizeCategories: ["clothing"] };
    expect(tighten({ maxDistanceKm: 10, minCondition: "worn" }, adj, CONDITIONS)).toEqual({ maxDistanceKm: 7, minCondition: "good", strictSizeCategories: ["clothing"] });
    expect(tighten({}, adj, CONDITIONS)).toMatchObject({ maxDistanceKm: 7, minCondition: "good" });
    expect(tighten({ maxDistanceKm: 1.2, minCondition: "new" }, adj, CONDITIONS)).toMatchObject({ maxDistanceKm: 1, minCondition: "new" });
  });

  it("can never loosen a limit, over many random bases (LRN-04)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 2000; i++) {
      const base = { maxDistanceKm: rnd() < 0.5 ? undefined : Math.round(rnd() * 60 * 10) / 10 + 0.5, minCondition: rnd() < 0.5 ? undefined : CONDITIONS[Math.floor(rnd() * 4)], strictSizeCategories: rnd() < 0.5 ? [] : ["toys"] };
      const adj = { distanceFactor: rnd() < 0.5 ? 0.7 : undefined, raiseConditionFloor: rnd() < 0.5, strictSizeCategories: rnd() < 0.5 ? ["clothing"] : [] };
      const out = tighten(base, adj, CONDITIONS);
      if (base.maxDistanceKm !== undefined) expect(out.maxDistanceKm!).toBeLessThanOrEqual(base.maxDistanceKm);
      if (base.minCondition) expect(CONDITIONS.indexOf(out.minCondition!)).toBeLessThanOrEqual(CONDITIONS.indexOf(base.minCondition));
      expect(out.strictSizeCategories).toEqual(expect.arrayContaining(base.strictSizeCategories));
      expect(Object.keys(out).sort()).toEqual(expect.arrayContaining(["strictSizeCategories"]));
    }
  });

  it("has no way to express topics, terms or commitments (LRN-04)", () => {
    const adj = deriveAdjustments([lesson("decline:price:clothing", 9), lesson("decline:too_far:clothing", 9)]);
    expect(Object.keys(adj).sort()).toEqual(["distanceFactor", "strictSizeCategories"]);
  });
});
