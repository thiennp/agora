import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { districtDistanceKm, distanceBand } from "./distance-band";
import { incompatibility, reasonLine, score, type ScoredItem } from "./score";

const now = new Date("2026-10-27T12:00:00Z");
const item = (o: Partial<ScoredItem>): ScoredItem => ({ id: "i", familyId: "f1", category: "clothing", size: "68", condition: "good", createdAt: now.toISOString(), ...o });
const ctx = { now, distanceKm: 0, declines: 0 };

describe("distance", () => {
  it("measures between cells and bands the result", () => {
    expect(districtDistanceKm("g:30.25:-97.75", "g:30.25:-97.75")).toBe(0);
    const km = districtDistanceKm("g:30.25:-97.75", "g:30.30:-97.75")!;
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(6);
    expect(distanceBand(km)).toBe("mid");
    expect(districtDistanceKm("n:a", "n:b")).toBeNull();
    expect(distanceBand(null)).toBe("unknown");
  });
});

describe("scoring", () => {
  it("rejects hard incompatibilities", async () => {
    const app = await loadApp("kids-gear");
    expect(incompatibility(app, item({ category: "toys" }), item({ familyId: "f2" }))).toMatch(/category/);
    expect(incompatibility(app, item({}), item({}))).toMatch(/owner/);
    expect(incompatibility(app, item({ size: "68" }), item({ familyId: "f2", size: "86" }))).toMatch(/size/);
    expect(incompatibility(app, item({ condition: "worn" }), item({ familyId: "f2", condition: "good" }))).toMatch(/condition/);
    expect(incompatibility(app, item({ size: "74" }), item({ familyId: "f2", size: "68" }))).toBeNull();
  });

  it("is deterministic and explains every factor (MAT-SCO-01, 03)", async () => {
    const app = await loadApp("kids-gear");
    const offer = item({});
    const want = item({ familyId: "f2", condition: undefined });
    const a = score(app, offer, want, ctx);
    expect(score(app, offer, want, ctx)).toEqual(a);
    expect(a.factors.map((f) => f.name)).toEqual(["category", "size", "condition", "distance", "timing"]);
    expect(a.total).toBe(a.factors.reduce((s, f) => s + f.points, 0));
  });

  it("ranks closer, better-fitting, fresher offers higher", async () => {
    const app = await loadApp("kids-gear");
    const want = item({ familyId: "f2" });
    const best = score(app, item({ condition: "like-new" }), want, ctx).total;
    expect(best).toBeGreaterThan(score(app, item({ condition: "good" }), want, ctx).total);
    expect(best).toBeGreaterThan(score(app, item({ condition: "like-new" }), want, { ...ctx, distanceKm: 12 }).total);
    expect(best).toBeGreaterThan(score(app, item({ condition: "like-new", size: "74" }), want, ctx).total);
  });

  it("lowers the score for previously declined patterns (MAT-SCO-02)", async () => {
    const app = await loadApp("kids-gear");
    const want = item({ familyId: "f2" });
    const base = score(app, item({}), want, ctx);
    const declined = score(app, item({}), want, { ...ctx, declines: 2 });
    expect(declined.total).toBe(base.total - 10);
    expect(declined.factors.at(-1)?.name).toBe("declined");
  });

  it("writes one reason line", async () => {
    const app = await loadApp("kids-gear");
    const line = reasonLine(score(app, item({}), item({ familyId: "f2" }), ctx));
    expect(line).toMatch(/^Both are clothing, size 68 matches/);
    expect(line.endsWith(".")).toBe(true);
  });
});
