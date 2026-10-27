import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createMandateBook, MandateRuleError } from "./mandate";
import { eligibleStandingTopics } from "./standing-rule-eligibility";
import { createMandateStore } from "../infrastructure/mandate.repository";

async function setup(appId = "kids-gear") {
  const app = await loadApp(appId);
  let clock = new Date("2026-10-27T12:00:00Z");
  const gatekeeper = createGatekeeper({ app, now: () => clock });
  const book = createMandateBook({ app, gatekeeper, store: createMandateStore(), now: () => clock });
  return { app, gatekeeper, book, advance: (days: number) => (clock = new Date(clock.getTime() + days * 86_400_000)) };
}

describe("mandates", () => {
  it("lists only low-risk standing-rule topics", async () => {
    const { app } = await setup();
    expect(eligibleStandingTopics(app)).toEqual(["pickup_time_window", "size_question"]);
  });

  it("creates expiring rules that the gatekeeper then honours, and refuses everything else (OWN-MND-02)", async () => {
    const { book, gatekeeper } = await setup();
    expect(gatekeeper.evaluateIncoming({ familyId: "f1", text: "Could we meet tomorrow afternoon?" }).outcome).toBe("ask");
    const rule = book.add({ familyId: "f1", topic: "pickup_time_window" });
    expect(new Date(rule.expiresAt).toISOString()).toBe("2026-11-26T12:00:00.000Z");
    expect(gatekeeper.evaluateIncoming({ familyId: "f1", text: "Could we meet tomorrow afternoon?" }).outcome).toBe("auto");
    for (const t of ["price_terms", "commitment", "location_reveal", "obey_other_agent", "item_description", "nope"]) {
      expect(() => book.add({ familyId: "f1", topic: t }), t).toThrow(MandateRuleError);
    }
  });

  it("caps rule lifetime, replaces a rule for the same topic, and expires on time", async () => {
    const { book, advance } = await setup();
    expect(new Date(book.add({ familyId: "f1", topic: "pickup_time_window", days: 400 }).expiresAt).getTime() - new Date("2026-10-27T12:00:00Z").getTime()).toBe(90 * 86_400_000);
    book.add({ familyId: "f1", topic: "pickup_time_window", days: 5 });
    expect(book.list("f1")).toHaveLength(1);
    advance(6);
    expect(book.list("f1")).toHaveLength(0);
  });

  it("revokes immediately and only for the owner (OWN-04)", async () => {
    const { book, gatekeeper } = await setup();
    const rule = book.add({ familyId: "f1", topic: "pickup_time_window" });
    expect(() => book.revoke("other", rule.id)).toThrow(MandateRuleError);
    book.revoke("f1", rule.id);
    expect(book.list("f1")).toEqual([]);
    expect(gatekeeper.evaluateIncoming({ familyId: "f1", text: "Could we meet tomorrow afternoon?" }).outcome).toBe("ask");
  });

  it("validates hard limits against the app and exposes them to matching and negotiation (OWN-MND-01)", async () => {
    const { book } = await setup();
    expect(() => book.setLimits("f1", { blockedCategories: ["spaceship"] })).toThrow(MandateRuleError);
    expect(() => book.setLimits("f1", { allowedTerms: ["free", "gold"] })).toThrow(MandateRuleError);
    expect(() => book.setLimits("f1", { maxDistanceKm: 0 })).toThrow(MandateRuleError);
    book.setLimits("f1", { maxDistanceKm: 4, blockedCategories: ["toys"], minCondition: "good", allowedTerms: ["free"], availability: [{ from: "2026-11-02T10:00:00Z", to: "2026-11-02T12:00:00Z" }] });
    expect(book.limitsOf("f1")).toEqual({ maxDistanceKm: 4, blockedCategories: ["toys"] });
    expect(book.negotiationMandate("f1", "de")).toMatchObject({ allowedTerms: ["free"], minCondition: "good", language: "de" });
    const g = await setup("garden-tools");
    expect(g.book.getLimits("g1").allowedTerms).toEqual(["swap"]);
  });
});
