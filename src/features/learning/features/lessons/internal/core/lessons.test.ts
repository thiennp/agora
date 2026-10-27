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

import { blockedByLearned } from "./adjustments";
import { lessonFromStretch } from "./lesson.schema";

describe("relaxing with the owner's approval (stretch evidence)", () => {
  const stretch = (reason: string, count: number, cat = "clothing"): Lesson => ({ ...lesson(`stretch:${reason}:${cat}`, count, "stretch" as Lesson["kind"]) });

  it("builds a stretch lesson from structured facts only", () => {
    expect(lessonFromStretch({ reason: "too_far", category: "clothing" })).toEqual({ kind: "stretch", key: "stretch:too_far:clothing", text: "Was happy to look beyond the usual distance limit for clothing deals." });
    expect(lessonFromStretch({ reason: "my address is 12 Oak Street" })).toBeNull();
  });

  it("loosens a limit in steps as approved stretch deals are confirmed, never below the base", () => {
    const decline = lesson("decline:too_far:clothing", 3);
    expect(deriveAdjustments([decline]).distanceFactor).toBe(0.7);
    expect(deriveAdjustments([decline, stretch("too_far", 1)]).distanceFactor).toBe(0.85);
    expect(deriveAdjustments([decline, stretch("too_far", 2)]).distanceFactor).toBeUndefined();
    expect(deriveAdjustments([decline, stretch("too_far", 5)]).distanceFactor).toBeUndefined();
    // the result is only ever a tightening or nothing: the owner's own base limit is the floor
    expect(tighten({ maxDistanceKm: 10 }, deriveAdjustments([decline, stretch("too_far", 1)]), CONDITIONS).maxDistanceKm).toBe(8.5);
    expect(tighten({ maxDistanceKm: 10 }, deriveAdjustments([decline, stretch("too_far", 2)]), CONDITIONS).maxDistanceKm).toBe(10);
  });

  it("tightens again when declines build up after relaxing", () => {
    const relaxed = [lesson("decline:too_far:clothing", 3), stretch("too_far", 2)];
    expect(deriveAdjustments(relaxed).distanceFactor).toBeUndefined();
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 4), stretch("too_far", 2)]).distanceFactor).toBeUndefined();
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 5), stretch("too_far", 2)]).distanceFactor).toBe(0.85);
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 6), stretch("too_far", 2)]).distanceFactor).toBe(0.7);
  });

  it("relaxes the condition floor and exact sizes the same way, per reason and category", () => {
    const lessons = [lesson("decline:condition:clothing", 2), lesson("decline:wrong_size:clothing", 2), lesson("decline:wrong_size:toys", 2)];
    expect(deriveAdjustments(lessons)).toMatchObject({ raiseConditionFloor: true, strictSizeCategories: ["clothing", "toys"] });
    const after = deriveAdjustments([...lessons, stretch("condition", 1), stretch("wrong_size", 1, "clothing")]);
    expect(after.raiseConditionFloor).toBeUndefined();
    expect(after.strictSizeCategories).toEqual(["toys"]);
    // stretch evidence for another category or reason does not relax this one
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 3), stretch("too_far", 2, "toys")]).distanceFactor).toBe(0.7);
    expect(deriveAdjustments([lesson("decline:too_far:clothing", 3), stretch("condition", 2)]).distanceFactor).toBe(0.7);
  });

  it("never loosens beyond the base, even with stretch evidence, over random inputs (LRN-04)", () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 2000; i++) {
      const lessons = [lesson("decline:too_far:clothing", 1 + Math.floor(rnd() * 8)), lesson("decline:condition:clothing", 1 + Math.floor(rnd() * 8)), stretch("too_far", Math.floor(rnd() * 5)), stretch("condition", Math.floor(rnd() * 5))];
      const base = { maxDistanceKm: rnd() < 0.5 ? undefined : 2 + Math.round(rnd() * 40), minCondition: rnd() < 0.5 ? undefined : CONDITIONS[Math.floor(rnd() * 4)] };
      const out = tighten(base, deriveAdjustments(lessons), CONDITIONS);
      if (base.maxDistanceKm !== undefined) expect(out.maxDistanceKm!).toBeLessThanOrEqual(base.maxDistanceKm);
      if (base.minCondition) expect(CONDITIONS.indexOf(out.minCondition!)).toBeLessThanOrEqual(CONDITIONS.indexOf(base.minCondition));
    }
  });

  it("names which learned limits (and only those) keep a candidate out", () => {
    const base = { maxDistanceKm: undefined, minCondition: undefined, strictSizeCategories: [] as string[] };
    const learned = { maxDistanceKm: 7, minCondition: "good", strictSizeCategories: ["clothing"] };
    const f = { category: "clothing", distanceKm: 9, offerCondition: "worn", offerSize: "74", wantSize: "68" };
    expect(blockedByLearned(base, learned, CONDITIONS, f)).toEqual(["too_far", "condition", "wrong_size"]);
    expect(blockedByLearned(base, learned, CONDITIONS, { ...f, distanceKm: 5, offerCondition: "good", offerSize: "68" })).toEqual([]);
    // excluded by the owner's own base limit too: not a stretch
    expect(blockedByLearned({ ...base, maxDistanceKm: 8 }, learned, CONDITIONS, f)).not.toContain("too_far");
    expect(blockedByLearned({ ...base, minCondition: "good" }, learned, CONDITIONS, f)).not.toContain("condition");
    expect(blockedByLearned(base, learned, CONDITIONS, { ...f, distanceKm: null })).not.toContain("too_far");
    // too far beyond the learned limit (more than 30%), or more than one condition step below it: not worth asking (LRN-10)
    expect(blockedByLearned(base, learned, CONDITIONS, { ...f, distanceKm: 9.1 })).toContain("too_far");
    expect(blockedByLearned(base, learned, CONDITIONS, { ...f, distanceKm: 9.2 })).not.toContain("too_far");
    expect(blockedByLearned(base, { ...learned, minCondition: "like-new" }, CONDITIONS, { ...f, offerCondition: "worn" })).not.toContain("condition");
    expect(blockedByLearned(base, { ...learned, minCondition: "like-new" }, CONDITIONS, { ...f, offerCondition: "good" })).toContain("condition");
    expect(blockedByLearned(base, { maxDistanceKm: 7 }, CONDITIONS, { ...f, category: "toys" })).toEqual(["too_far"]);
  });
});
