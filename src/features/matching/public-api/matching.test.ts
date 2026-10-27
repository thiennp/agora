import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createMatchService } from "./infrastructure";
import type { IndexedItem } from "./types";

const now = new Date("2026-10-27T12:00:00Z");
let n = 0;
const it_ = (o: Partial<IndexedItem>): IndexedItem => ({
  id: `i${++n}`, appId: "kids-gear", familyId: `f${n}`, kind: "offer", category: "clothing", size: "68", condition: "good",
  createdAt: now.toISOString(), districtCode: "g:52.50:13.40", ...o,
});

async function setup(limits: Record<string, { maxDistanceKm?: number; blockedCategories?: string[] }> = {}) {
  return createMatchService({ app: await loadApp("kids-gear"), now: () => now, limitsOf: (f) => limits[f] ?? {} });
}

describe("matching", () => {
  it("finds counterparts of the opposite kind in the same category, best first, capped at three", async () => {
    const m = await setup();
    const want = it_({ kind: "want", familyId: "w", condition: undefined });
    const offers = [
      it_({ condition: "worn", id: "o-worn" }),
      it_({ condition: "like-new", id: "o-best" }),
      it_({ condition: "good", id: "o-good" }),
      it_({ condition: "good", id: "o-far", districtCode: "g:52.60:13.40" }),
      it_({ category: "toys", id: "o-toy" }),
    ];
    offers.forEach((o) => m.onListed(o));
    const r = m.candidatesFor(want);
    expect(r.matches.map((x) => x.offerItemId)).toEqual(["o-best", "o-good", "o-worn"]);
    expect(r.matches.every((x) => x.reason.length > 0 && x.factors.length >= 5)).toBe(true);
  });

  it("works from the offer side too and never matches a family with itself", async () => {
    const m = await setup();
    const offer = it_({ familyId: "a" });
    m.onListed(it_({ kind: "want", familyId: "a" }));
    m.onListed(it_({ kind: "want", familyId: "b", id: "w-b" }));
    const r = m.candidatesFor(offer);
    expect(r.matches.map((x) => x.wantItemId)).toEqual(["w-b"]);
  });

  it("only looks in nearby districts and respects hard distance limits (MAT-CAN-01, 02)", async () => {
    const m = await setup({ w: { maxDistanceKm: 2 } });
    const want = it_({ kind: "want", familyId: "w" });
    m.onListed(it_({ id: "near-cell", districtCode: "g:52.50:13.45" }));
    m.onListed(it_({ id: "same", districtCode: "g:52.50:13.40" }));
    m.onListed(it_({ id: "far", districtCode: "g:53.50:13.40" }));
    const r = m.candidatesFor(want);
    expect(r.matches.map((x) => x.offerItemId)).toEqual(["same"]);
  });

  it("respects the other owner's blocked categories and their own", async () => {
    const m = await setup({ blocker: { blockedCategories: ["clothing"] }, w: { blockedCategories: ["toys"] } });
    m.onListed(it_({ familyId: "blocker", id: "blocked" }));
    m.onListed(it_({ id: "ok", familyId: "other" }));
    expect(m.candidatesFor(it_({ kind: "want", familyId: "x" })).matches.map((x) => x.offerItemId)).toEqual(["ok"]);
    expect(m.candidatesFor(it_({ kind: "want", familyId: "w", category: "toys" })).emptyReason).toMatch(/not to trade/);
  });

  it("removes unlisted items from results immediately", async () => {
    const m = await setup();
    m.onListed(it_({ id: "gone" }));
    m.onUnlisted("gone");
    expect(m.candidatesFor(it_({ kind: "want" })).matches).toEqual([]);
  });

  it("explains an empty result in plain words (MAT-04)", async () => {
    const m = await setup();
    const r = m.candidatesFor(it_({ kind: "want" }));
    expect(r.matches).toEqual([]);
    expect(r.emptyReason).toMatch(/Nobody nearby is offering this yet/);
  });

  it("never shows a dismissed pair again and lowers similar scores (MAT-03)", async () => {
    const m = await setup();
    const want = it_({ kind: "want", familyId: "w" });
    m.onListed(it_({ id: "o1", familyId: "a" }));
    m.onListed(it_({ id: "o2", familyId: "b" }));
    const first = m.candidatesFor(want).matches;
    expect(first).toHaveLength(2);
    m.dismiss("w", first[0]!, first[0]!.offerItemId === "o1" ? "a" : "b", "clothing");
    const again = m.candidatesFor(want).matches;
    expect(again.map((x) => x.id)).not.toContain(first[0]!.id);
  });

  it("matches within named districts only inside the same name", async () => {
    const m = await setup();
    m.onListed(it_({ id: "same-name", districtCode: "n:hyde-park" }));
    m.onListed(it_({ id: "other-name", districtCode: "n:zilker" }));
    const r = m.candidatesFor(it_({ kind: "want", districtCode: "n:hyde-park" }));
    expect(r.matches.map((x) => x.offerItemId)).toEqual(["same-name"]);
  });
});

describe("candidate lookup at higher latitudes", () => {
  it("finds a candidate inside the radius in east-west direction, where grid cells are narrower (MAT-CAN-01)", async () => {
    const m = await setup();
    // 0.20 degrees east at 52.5 N is about 13.6 km (4 cells): inside the default 15 km radius, but a lookup sized by the
    // cell height (5.6 km) would stop 3 cells out and miss it.
    m.onListed(it_({ id: "east", districtCode: "g:52.50:13.60" }));
    m.onListed(it_({ id: "too-far", districtCode: "g:52.50:13.80" }));
    const r = m.candidatesFor(it_({ kind: "want", familyId: "w", districtCode: "g:52.50:13.40" }));
    expect(r.matches.map((x) => x.offerItemId)).toEqual(["east"]);
  });
});
