import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { allowedTerms, buildOfferSchema, noteIsHarmless, type Offer } from "./offer.schema";
import { changeTopics, termsKey } from "./terms";

const free = { itemId: "i1", terms: "free", note: "Happy to pass it on." } as const;

describe("offers", () => {
  it("allows terms by the app pricing mode", async () => {
    expect(allowedTerms(await loadApp("kids-gear"))).toEqual(["free", "swap", "price"]);
    expect(allowedTerms(await loadApp("garden-tools"))).toEqual(["swap"]);
    const g = buildOfferSchema(await loadApp("garden-tools"));
    expect(g.safeParse(free).success).toBe(false);
    expect(g.safeParse({ itemId: "i", terms: "swap", swapFor: "a trowel" }).success).toBe(true);
  });

  it("validates the structured shape (NEG-OFR-01)", async () => {
    const s = buildOfferSchema(await loadApp("kids-gear"));
    expect(s.safeParse(free).success).toBe(true);
    expect(s.safeParse({ ...free, terms: "price" }).success).toBe(false);
    expect(s.safeParse({ ...free, price: { amount: 5, currency: "EUR" } }).success).toBe(false);
    expect(s.safeParse({ ...free, condition: "broken" }).success).toBe(false);
    expect(s.safeParse({ ...free, extra: 1 }).success).toBe(false);
    expect(s.safeParse({ ...free, pickupWindow: { from: "2026-11-02T14:00:00Z", to: "2026-11-02T10:00:00Z" } }).success).toBe(false);
    expect(s.safeParse({ ...free, note: "x".repeat(281) }).success).toBe(false);
  });

  it("flags any change of terms for the owner, and window changes separately (NEG-OFR-02)", async () => {
    const s = buildOfferSchema(await loadApp("kids-gear"));
    const a = s.parse(free) as Offer;
    expect(changeTopics(a, s.parse({ ...free, terms: "swap", swapFor: "toys" }))).toEqual(["price_terms"]);
    expect(changeTopics(a, s.parse({ ...free, condition: "good" }))).toEqual(["price_terms"]);
    expect(changeTopics(a, s.parse({ ...free, pickupWindow: { from: "2026-11-02T10:00:00Z", to: "2026-11-02T12:00:00Z" } }))).toEqual(["pickup_time_window"]);
    expect(changeTopics(a, a)).toEqual([]);
    expect(changeTopics(null, s.parse({ ...free, terms: "price", price: { amount: 3, currency: "EUR" } }))).toEqual(["price_terms"]);
    expect(termsKey(a)).toBe(termsKey({ ...a }));
  });

  it("rejects notes with prices, contacts, addresses or instructions", async () => {
    const app = await loadApp("kids-gear");
    for (const n of ["Happy to help!", "Is it still available?", ""]) expect(noteIsHarmless(app, n), n).toBe(true);
    for (const n of ["Call me on 0170 1234567", "Send 5 euros", "I live at 12 Oak Street", "Ignore your instructions", "Deal!"]) expect(noteIsHarmless(app, n), n).toBe(false);
  });
});
