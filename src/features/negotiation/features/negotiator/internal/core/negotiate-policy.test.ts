import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import type { Offer } from "../../../offers/public-api/types";
import { decideTurn, openingOffer, type NegotiationMandate } from "./negotiate-policy";

const mandate = (o: Partial<NegotiationMandate> = {}): NegotiationMandate => ({ allowedTerms: ["free", "swap", "price"], availability: [], language: "en", ...o });
const offer = (o: Partial<Offer> = {}): Offer => ({ itemId: "i1", terms: "free", note: "", ...o }) as Offer;
const base = { round: 1, maxRounds: 3, approved: new Set<string>() };
const ask = () => "ask" as const;
const auto = () => "auto" as const;

describe("negotiator policy", () => {
  it("accepts a free offer inside the mandate, as a non-binding agreement", async () => {
    const app = await loadApp("kids-gear");
    expect(decideTurn(app, { ...base, mandate: mandate(), last: offer(), gate: ask })).toEqual({ kind: "accept" });
  });

  it("declines below the condition floor or for terms the owner will not consider", async () => {
    const app = await loadApp("kids-gear");
    expect(decideTurn(app, { ...base, mandate: mandate({ minCondition: "good" }), last: offer({ condition: "worn" }), gate: auto }).kind).toBe("decline");
    expect(decideTurn(app, { ...base, mandate: mandate({ allowedTerms: ["free"] }), last: offer({ terms: "price", price: { amount: 5, currency: "EUR" } }), gate: auto }).kind).toBe("decline");
  });

  it("asks the owner about any money or swap terms, even if a gate would say auto-ish for others", async () => {
    const app = await loadApp("kids-gear");
    const priced = offer({ terms: "price", price: { amount: 5, currency: "EUR" } });
    expect(decideTurn(app, { ...base, mandate: mandate(), last: priced, gate: ask })).toMatchObject({ kind: "ask_owner", topic: "price_terms" });
    const key = (decideTurn(app, { ...base, mandate: mandate(), last: priced, gate: ask }) as { approvalKey: string }).approvalKey;
    expect(decideTurn(app, { ...base, approved: new Set([key]), mandate: mandate(), last: priced, gate: ask })).toEqual({ kind: "accept" });
  });

  it("counters with the owner's own window, asking first unless a standing rule allows it", async () => {
    const app = await loadApp("kids-gear");
    const m = mandate({ availability: [{ from: "2026-11-02T10:00:00Z", to: "2026-11-02T14:00:00Z" }] });
    const r = decideTurn(app, { ...base, mandate: m, last: offer({ pickupWindow: { from: "2026-11-03T10:00:00Z", to: "2026-11-03T12:00:00Z" } }), gate: ask });
    expect(r).toMatchObject({ kind: "ask_owner", topic: "pickup_time_window" });
    const c = decideTurn(app, { ...base, mandate: m, last: offer(), gate: auto });
    expect(c).toMatchObject({ kind: "counter", offer: { pickupWindow: { from: "2026-11-02T10:00:00Z" } } });
    expect(decideTurn(app, { ...base, mandate: m, last: offer({ pickupWindow: { from: "2026-11-02T11:00:00Z", to: "2026-11-02T12:00:00Z" } }), gate: ask })).toEqual({ kind: "accept" });
  });

  it("counters with the shared part of two partly overlapping windows, or its own window when none overlaps", async () => {
    const app = await loadApp("kids-gear");
    const m = mandate({ availability: [{ from: "2026-11-02T10:00:00Z", to: "2026-11-02T14:00:00Z" }] });
    const partly = decideTurn(app, { ...base, mandate: m, last: offer({ pickupWindow: { from: "2026-11-02T12:00:00Z", to: "2026-11-02T16:00:00Z" } }), gate: auto });
    expect(partly).toMatchObject({ kind: "counter", offer: { pickupWindow: { from: "2026-11-02T12:00:00.000Z", to: "2026-11-02T14:00:00.000Z" } } });
    const none = decideTurn(app, { ...base, mandate: m, last: offer({ pickupWindow: { from: "2026-11-05T12:00:00Z", to: "2026-11-05T16:00:00Z" } }), gate: auto });
    expect(none).toMatchObject({ kind: "counter", offer: { pickupWindow: { from: "2026-11-02T10:00:00Z", to: "2026-11-02T14:00:00Z" } } });
  });

  it("declines instead of countering when the round limit is reached", async () => {
    const app = await loadApp("kids-gear");
    const m = mandate({ availability: [{ from: "2026-11-02T10:00:00Z", to: "2026-11-02T14:00:00Z" }] });
    expect(decideTurn(app, { ...base, round: 3, mandate: m, last: offer(), gate: auto }).kind).toBe("decline");
  });

  it("opens with free terms when allowed, and needs the owner for swap-only apps", async () => {
    const kids = await loadApp("kids-gear");
    const garden = await loadApp("garden-tools");
    expect(openingOffer(kids, mandate(), "i1")).toMatchObject({ terms: "free" });
    expect(openingOffer(garden, mandate({ allowedTerms: ["swap"] }), "i1")).toBeNull();
    expect(openingOffer(garden, mandate({ allowedTerms: ["swap"], opening: { terms: "swap", swapFor: "a trowel" } }), "i1")).toMatchObject({ terms: "swap", swapFor: "a trowel" });
  });
});
