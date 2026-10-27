import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createNegotiationService } from "@/features/negotiation/public-api/infrastructure";
import type { NegotiationMandate } from "@/features/negotiation/public-api/types";
import { createMatchService } from "@/features/matching/public-api/infrastructure";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { createMandateBook, createMandateStore, createOwnerCards, OwnerCardError } from "./infrastructure";

const now = () => new Date("2026-10-27T12:00:00Z");

/** Two owners, one jacket, everything wired together: catalog, gatekeeper, negotiation, owner cards, matching. */
async function setup(opts: { swap?: boolean } = {}) {
  const app = await loadApp("kids-gear");
  const bus = createDealEventBus();
  const gatekeeper = createGatekeeper({ app, now });
  const book = createMandateBook({ app, gatekeeper, store: createMandateStore(), now });
  const consent = new Set(["fo", "fw"]);
  const catalog = createCatalogService({ app, canShare: (f) => consent.has(f) });
  const offerItem = await catalog.items.create("fo", { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Jacket" });
  const wantItem = await catalog.items.create("fw", { kind: "want", category: "clothing", size: "68" });
  await catalog.items.list(offerItem.id);
  await catalog.items.list(wantItem.id);

  book.setLimits("fo", { allowedTerms: ["free", "swap"] });
  book.setLimits("fw", { allowedTerms: ["free", "swap"] });
  const negotiation = createNegotiationService({
    app, items: catalog.items, gatekeeper, bus, now,
    mandateOf: (f) => book.negotiationMandate(f, "en", f === "fw" && opts.swap ? { terms: "swap", swapFor: "a baby book" } : undefined) as NegotiationMandate,
  });
  const cards = createOwnerCards({ app, negotiation, bus, mandates: book, now });
  const match = { offerItemId: offerItem.id, wantItemId: wantItem.id, offerFamilyId: "fo", wantFamilyId: "fw" };
  return { app, bus, gatekeeper, book, catalog, negotiation, cards, match, offerItem };
}

describe("owner cards", () => {
  it("takes a free deal from agent agreement to confirmed through the owners' cards, and only then reserves the items", async () => {
    const s = await setup();
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    expect(s.cards.questionsFor("fo")).toEqual([]);
    const [cardO] = s.cards.confirmationsFor("fo");
    const [cardW] = s.cards.confirmationsFor("fw");
    expect(cardO && cardW).toBeTruthy();

    await s.cards.decide(cardO!.id, "fo", "confirm");
    expect(s.cards.isFullyConfirmed(deal.id, ["fo", "fw"])).toBe(false);
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("in_deal");
    const done = await s.cards.decide(cardW!.id, "fw", "confirm", { code: "timing", text: "works for us" });
    expect(done.state).toBe("confirmed");
    expect(s.cards.isFullyConfirmed(deal.id, ["fo", "fw"])).toBe(true);
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("reserved");
    expect(s.cards.confirmationsFor("fo")).toEqual([]);
  });

  it("turns an ask into a one-tap card with redacted content and resumes the deal on yes (OWN-01..03)", async () => {
    const s = await setup({ swap: true });
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    await s.cards.settled();
    const [q] = s.cards.questionsFor("fo");
    expect(q).toMatchObject({ topic: "price_terms", status: "open", canRemember: false });
    expect(q!.text).toContain("a swap for a baby book");
    expect(q!.suggestedAnswers.map((a) => a.id)).toEqual(["yes", "no"]);
    expect(q!.expiresAt).toBe(deal.expiresAt);

    const after = await s.cards.answerQuestion(q!.id, "fo", "yes");
    expect(after.state).toBe("awaiting_owners");
    expect(s.cards.questionsFor("fo")).toEqual([]);
    expect(s.cards.confirmationsFor("fw")).toHaveLength(1);
    expect(s.cards.interruptions()).toEqual({ deals: 1, questions: 1, perDeal: 1 });
  });

  it("declines the deal and frees the items when the owner says no", async () => {
    const s = await setup({ swap: true });
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    await s.cards.settled();
    const [q] = s.cards.questionsFor("fo");
    const after = await s.cards.answerQuestion(q!.id, "fo", "no");
    expect(after.state).toBe("declined");
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("listed");
  });

  it("never lets 'remember this' create a rule for always-ask topics, and changes nothing when refused", async () => {
    const s = await setup({ swap: true });
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    await s.cards.settled();
    const [q] = s.cards.questionsFor("fo");
    await expect(s.cards.answerQuestion(q!.id, "fo", "yes", { remember: { days: 30 } })).rejects.toMatchObject({ code: "remember_not_allowed" });
    expect(s.cards.questionsFor("fo")).toHaveLength(1);
    expect(s.book.list("fo")).toEqual([]);
    expect((await s.negotiation.get(deal.id))?.state).toBe("awaiting_owner_input");
  });

  it("remembers a pickup-time answer as a standing rule so the next deal does not interrupt (OWN-MND-02, OWN-MND-04)", async () => {
    const availability = [{ from: "2026-11-02T10:00:00Z", to: "2026-11-02T14:00:00Z" }];
    const s = await setup();
    s.book.setLimits("fo", { allowedTerms: ["free"], availability });
    s.book.setLimits("fw", { allowedTerms: ["free"], availability: [{ from: "2026-11-02T11:00:00Z", to: "2026-11-02T13:00:00Z" }] });
    const d1 = await s.negotiation.start(s.match);
    await s.negotiation.run(d1.id);
    await s.cards.settled();
    const [q] = s.cards.questionsFor("fo");
    expect(q).toMatchObject({ topic: "pickup_time_window", canRemember: true });
    expect(q!.text).toContain("Your agent would like to suggest this pickup time");
    await s.cards.answerQuestion(q!.id, "fo", "yes", { remember: { days: 14 } });
    expect(s.book.list("fo")).toHaveLength(1);
    // the same owner no longer gets asked about a pickup time
    expect(s.gatekeeper.evaluateIncoming({ familyId: "fo", text: "Could we meet tomorrow afternoon?" }).outcome).toBe("auto");
    s.book.revoke("fo", s.book.list("fo")[0]!.id);
    expect(s.gatekeeper.evaluateIncoming({ familyId: "fo", text: "Could we meet tomorrow afternoon?" }).outcome).toBe("ask");
  });

  it("checks that every card action belongs to its owner and cannot be repeated (NFR-04)", async () => {
    const s = await setup({ swap: true });
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    await s.cards.settled();
    const [q] = s.cards.questionsFor("fo");
    await expect(s.cards.answerQuestion(q!.id, "fw", "yes")).rejects.toMatchObject({ code: "not_owner" });
    await expect(s.cards.answerQuestion("missing", "fo", "yes")).rejects.toMatchObject({ code: "not_found" });
    await s.cards.answerQuestion(q!.id, "fo", "yes");
    await expect(s.cards.answerQuestion(q!.id, "fo", "yes")).rejects.toMatchObject({ code: "already_decided" });
    const [c] = s.cards.confirmationsFor("fo");
    await expect(s.cards.decide(c!.id, "fw", "confirm")).rejects.toBeInstanceOf(OwnerCardError);
    await expect(s.cards.decide(c!.id, "fo", "confirm", { code: "bogus" as never })).rejects.toMatchObject({ code: "bad_reason" });
    await s.cards.decide(c!.id, "fo", "decline", { code: "too_far" });
    await expect(s.cards.decide(c!.id, "fo", "confirm")).rejects.toMatchObject({ code: "already_decided" });
  });

  it("closes the other owner's open cards when a deal is declined or expires (OWN-QST-02)", async () => {
    const s = await setup();
    const deal = await s.negotiation.start(s.match);
    await s.negotiation.run(deal.id);
    const [co] = s.cards.confirmationsFor("fo");
    await s.cards.decide(co!.id, "fo", "decline", { code: "condition" });
    expect(s.cards.confirmationsFor("fw")).toEqual([]);
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("listed");
  });

  it("feeds owners' hard limits into matching and erases cards and rules with the family (OWN-MND-01, FAM-03)", async () => {
    const s = await setup();
    s.book.setLimits("fw", { blockedCategories: ["clothing"], maxDistanceKm: 3 });
    const matcher = createMatchService({ app: s.app, now, limitsOf: (f) => s.book.limitsOf(f) });
    const base = { appId: "kids-gear", category: "clothing", size: "68", condition: "good", createdAt: now().toISOString(), districtCode: "g:52.50:13.40" };
    matcher.onListed({ ...base, id: "o1", familyId: "fo", kind: "offer" });
    expect(matcher.candidatesFor({ ...base, id: "w1", familyId: "fw", kind: "want" }).emptyReason).toMatch(/not to trade/);

    s.book.add({ familyId: "fo", topic: "pickup_time_window" });
    s.cards.eraseFamily("fo");
    expect(s.book.list("fo")).toEqual([]);
    expect(s.book.getLimits("fo").allowedTerms).toEqual(["free"]);
  });
});
