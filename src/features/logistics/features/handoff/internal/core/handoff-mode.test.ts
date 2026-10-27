import { describe, expect, it } from "vitest";
import { checklistFor, overlapWindow, proposeMode, type Constraints } from "./handoff-mode";

const ALL = ["pickup", "locker", "parcel_shop", "shipping"] as const;
const a: Constraints = { districtCode: "g:52.50:13.40", availability: [] };
const b: Constraints = { districtCode: "g:52.50:13.45", availability: [] };
const w = (from: string, to: string) => ({ from: `2026-11-02T${from}:00.000Z`, to: `2026-11-02T${to}:00.000Z` });

describe("handoff mode", () => {
  it("prefers a locker, then a shop, then pickup, then shipping (LOG-HND-02)", () => {
    expect(proposeMode(ALL, a, b)?.mode).toBe("locker");
    expect(proposeMode(["parcel_shop", "pickup", "shipping"], a, b)?.mode).toBe("parcel_shop");
    expect(proposeMode(["pickup", "shipping"], a, b)?.mode).toBe("pickup");
    expect(proposeMode(["shipping"], a, b)?.mode).toBe("shipping");
  });

  it("respects each owner's allowed modes and the app's list (LOG-HND-01)", () => {
    expect(proposeMode(ALL, { ...a, allowedModes: ["shipping", "pickup"] }, b)?.mode).toBe("pickup");
    expect(proposeMode(["pickup"], { ...a, allowedModes: ["shipping"] }, b)).toBeNull();
  });

  it("needs a shared free window for in-person modes, otherwise falls back to shipping or nothing", () => {
    const morning = { ...a, availability: [w("08:00", "10:00")] };
    const afternoon = { ...b, availability: [w("14:00", "16:00")] };
    expect(proposeMode(ALL, morning, afternoon)?.mode).toBe("shipping");
    expect(proposeMode(["pickup", "locker"], morning, afternoon)).toBeNull();
    const overlap = { ...b, availability: [w("09:00", "12:00")] };
    expect(proposeMode(ALL, morning, overlap)).toMatchObject({ mode: "locker", window: w("09:00", "10:00") });
  });

  it("keeps in-person modes inside distance limits and never trusts an unknown distance", () => {
    expect(proposeMode(["pickup", "shipping"], { ...a, maxDistanceKm: 1 }, b)?.mode).toBe("shipping");
    expect(proposeMode(["pickup", "shipping"], { districtCode: "n:mitte", availability: [], maxDistanceKm: 5 }, { districtCode: "n:pankow", availability: [] })?.mode).toBe("shipping");
    expect(proposeMode(["pickup"], { districtCode: "n:mitte", availability: [] }, { districtCode: "n:pankow", availability: [] })?.mode).toBe("pickup");
  });

  it("overlaps windows and treats empty availability as no constraint", () => {
    expect(overlapWindow([], [])).toBeUndefined();
    expect(overlapWindow([], [w("10:00", "11:00")])).toEqual(w("10:00", "11:00"));
    expect(overlapWindow([w("10:00", "12:00")], [w("11:00", "13:00")])).toEqual(w("11:00", "12:00"));
    expect(overlapWindow([w("10:00", "11:00")], [w("11:00", "12:00")])).toBeUndefined();
  });

  it("gives a mode-specific checklist with no health advice (LOG-HND-03)", () => {
    for (const m of ALL) {
      const list = checklistFor(m, ["Extra rule."]);
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.at(-1)).toBe("Extra rule.");
      expect(list.join(" ")).not.toMatch(/health|medical|sleep|feeding/i);
    }
  });
});
