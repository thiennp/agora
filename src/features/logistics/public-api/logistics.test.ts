import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createNegotiationService } from "@/features/negotiation/public-api/infrastructure";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { recordEvents } from "@/hubs/DealEvents/query";
import { createLogistics, createSimulatedCarrier, LogisticsError } from "./infrastructure";
import type { Constraints, HandoffMode } from "./types";
import type { NegotiationMandate } from "@/features/negotiation/public-api/types";

const ADDRESS = "Beispielstraße 12, 10115 Berlin";
const PLACE = "Blue door at 5 Linden Way";
const free: NegotiationMandate = { allowedTerms: ["free"], availability: [], language: "en" };

async function setup(opts: { modes?: HandoffMode[]; confirm?: boolean; advice?: string[] } = {}) {
  const app = await loadApp("kids-gear");
  const bus = createDealEventBus();
  const events = recordEvents(bus).events;
  const gatekeeper = createGatekeeper({ app });
  const consent = new Set(["fo", "fw"]);
  const catalog = createCatalogService({ app, canShare: (f) => consent.has(f) });
  const offerItem = await catalog.items.create("fo", { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Jacket" });
  const wantItem = await catalog.items.create("fw", { kind: "want", category: "clothing", size: "68" });
  await catalog.items.list(offerItem.id);
  await catalog.items.list(wantItem.id);
  const negotiation = createNegotiationService({ app, items: catalog.items, gatekeeper, bus, mandateOf: () => free });
  let clock = new Date("2026-11-01T12:00:00Z");
  const plans = { rows: new Map() } as never;
  const shipments = { rows: new Map() } as never;
  const constraints = (f: string): Constraints => ({ districtCode: f === "fo" ? "g:52.50:13.40" : "g:52.50:13.45", availability: [], allowedModes: opts.modes });
  const logistics = createLogistics({
    app, deals: negotiation, carrier: createSimulatedCarrier({ now: () => clock }), secret: "test-secret-0123456789", bus, constraintsOf: constraints,
    adviceFor: async () => opts.advice ?? [], plans, shipments, now: () => clock,
  });
  const deal = await negotiation.start({ offerItemId: offerItem.id, wantItemId: wantItem.id, offerFamilyId: "fo", wantFamilyId: "fw" });
  await negotiation.run(deal.id);
  if (opts.confirm !== false) {
    await negotiation.ownerDecision(deal.id, "fo", "confirm");
    await negotiation.ownerDecision(deal.id, "fw", "confirm");
    await logistics.settled();
  }
  return { app, bus, events, catalog, negotiation, logistics, deal, offerItem, wantItem, plans: plans as { rows: Map<string, unknown> }, shipments: shipments as { rows: Map<string, unknown> }, advance: (h: number) => void (clock = new Date(clock.getTime() + h * 3_600_000)) };
}
const approveBoth = async (s: Awaited<ReturnType<typeof setup>>) => {
  await s.logistics.approve(s.deal.id, "fo");
  await s.logistics.approve(s.deal.id, "fw");
};
const window = { from: "2026-11-03T10:00:00.000Z", to: "2026-11-03T12:00:00.000Z" };

describe("logistics: plan and reveal", () => {
  it("makes a handover plan only after both owners confirm, preferring a locker (LOG-01, LOG-02, LOG-HND-02)", async () => {
    const s = await setup({ confirm: false });
    await s.logistics.settled();
    expect(await s.logistics.handoffCard(s.deal.id, "fo")).toEqual({ empty: true });
    await s.negotiation.ownerDecision(s.deal.id, "fo", "confirm");
    await s.logistics.settled();
    expect(await s.logistics.handoffCard(s.deal.id, "fw")).toEqual({ empty: true });
    await expect(s.logistics.approve(s.deal.id, "fo")).rejects.toMatchObject({ code: "wrong_state" });
    await s.negotiation.ownerDecision(s.deal.id, "fw", "confirm");
    await s.logistics.settled();
    const card = await s.logistics.handoffCard(s.deal.id, "fw");
    expect(card).toMatchObject({ empty: false, mode: "locker", state: "proposed", approvedByYou: false });
    expect(s.events.some((e) => e.type === "HandoffProposed")).toBe(true);
  });

  it("hides the exact meeting place until both owners agreed, then shows it to the other owner (LOG-03)", async () => {
    const s = await setup({ modes: ["pickup"] });
    await s.logistics.setPickupPlace(s.deal.id, "fo", PLACE);
    const before = await s.logistics.handoffCard(s.deal.id, "fw");
    expect(before).toMatchObject({ mode: "pickup", state: "proposed" });
    expect(JSON.stringify(before)).not.toContain("Linden");
    expect(JSON.stringify(await s.logistics.handoffCard(s.deal.id, "fo"))).toContain("Linden");
    await s.logistics.approve(s.deal.id, "fo");
    expect(JSON.stringify(await s.logistics.handoffCard(s.deal.id, "fw"))).not.toContain("Linden");
    await s.logistics.approve(s.deal.id, "fw");
    expect(await s.logistics.handoffCard(s.deal.id, "fw")).toMatchObject({ state: "approved", place: PLACE });
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("handoff");
    await expect(s.logistics.setPickupPlace(s.deal.id, "fw", PLACE)).rejects.toMatchObject({ code: "not_host" });
  });

  it("stores the place and the address encrypted, never in plain text (DB-03)", async () => {
    const s = await setup({ modes: ["pickup"] });
    await s.logistics.setPickupPlace(s.deal.id, "fo", PLACE);
    expect(JSON.stringify([...s.plans.rows.values()])).not.toContain("Linden");
    const sh = await setup({ modes: ["shipping"] });
    await approveBoth(sh);
    await sh.logistics.setShippingAddress(sh.deal.id, "fw", ADDRESS);
    expect(JSON.stringify([...sh.shipments.rows.values()])).not.toMatch(/Beispiel|10115/);
  });

  it("uses a public drop point for locker and shop modes, chosen from the host's area", async () => {
    const s = await setup({ modes: ["locker"] });
    await expect(s.logistics.chooseDropPoint(s.deal.id, "fw", "nope")).rejects.toMatchObject({ code: "invalid" });
    await s.logistics.chooseDropPoint(s.deal.id, "fw", "g:52.50:13.40:locker-1");
    await approveBoth(s);
    expect(await s.logistics.handoffCard(s.deal.id, "fo")).toMatchObject({ mode: "locker", dropPoint: { name: "Simulated Parcel Locker" } });
  });

  it("lets owners change the mode, which clears approvals, at most three times (LOG-01)", async () => {
    const s = await setup();
    await s.logistics.approve(s.deal.id, "fo");
    await s.logistics.propose(s.deal.id, "fw", "pickup");
    expect(await s.logistics.handoffCard(s.deal.id, "fo")).toMatchObject({ mode: "pickup", approvedByYou: false, approvedByOther: true });
    await s.logistics.propose(s.deal.id, "fo", "shipping");
    await s.logistics.propose(s.deal.id, "fw", "parcel_shop");
    await expect(s.logistics.propose(s.deal.id, "fo", "pickup")).rejects.toMatchObject({ code: "wrong_state" });
    const limited = await setup({ modes: ["pickup", "shipping"] });
    await expect(limited.logistics.propose(limited.deal.id, "fo", "locker")).rejects.toMatchObject({ code: "not_allowed" });
    await approveBoth(limited);
    await expect(limited.logistics.propose(limited.deal.id, "fo", "pickup")).rejects.toMatchObject({ code: "wrong_state" });
  });

  it("adds app safety advice to the checklist (LOG-HND-03)", async () => {
    const s = await setup({ advice: ["Car seats: check the manufacture date together."] });
    const card = await s.logistics.handoffCard(s.deal.id, "fo");
    expect(card.empty === false && card.checklist.at(-1)).toBe("Car seats: check the manufacture date together.");
  });

  it("checks that only the deal's owners can act", async () => {
    const s = await setup();
    await expect(s.logistics.approve(s.deal.id, "stranger")).rejects.toMatchObject({ code: "not_a_party" });
    await expect(s.logistics.handoffCard("missing", "fo")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("logistics: shipping", () => {
  async function shipping() {
    const s = await setup({ modes: ["shipping"] });
    await approveBoth(s);
    return s;
  }

  it("creates a label and appointment only when every condition holds, and only for the sender (LOG-02, LOG-SHP-01, 02)", async () => {
    const early = await setup({ modes: ["shipping"], confirm: false });
    await expect(early.logistics.createLabel(early.deal.id, "fo", window)).rejects.toMatchObject({ code: "wrong_state" });

    const s = await shipping();
    await expect(s.logistics.createLabel(s.deal.id, "fo", window)).rejects.toMatchObject({ code: "blocked", message: expect.stringContaining("delivery address") });
    await expect(s.logistics.setShippingAddress(s.deal.id, "fo", ADDRESS)).rejects.toMatchObject({ code: "not_recipient" });
    await s.logistics.setShippingAddress(s.deal.id, "fw", ADDRESS);
    await expect(s.logistics.createLabel(s.deal.id, "fw", window)).rejects.toMatchObject({ code: "blocked", message: expect.stringContaining("only the sender") });
    const out = await s.logistics.createLabel(s.deal.id, "fo", window);
    expect(out.labelText).toContain("SIMULATED");
    expect(out.appointment).toMatchObject({ kind: "dropoff", window });
    await expect(s.logistics.createLabel(s.deal.id, "fo", window)).rejects.toMatchObject({ code: "blocked", message: expect.stringContaining("already exists") });
  });

  it("shows the recipient's address only on the sender's label (LOG-SHP-04)", async () => {
    const s = await shipping();
    await s.logistics.setShippingAddress(s.deal.id, "fw", ADDRESS);
    await s.logistics.createLabel(s.deal.id, "fo", window);
    const sender = await s.logistics.handoffCard(s.deal.id, "fo");
    const recipient = await s.logistics.handoffCard(s.deal.id, "fw");
    expect(JSON.stringify(sender)).toContain(ADDRESS);
    expect(JSON.stringify(sender).match(/Beispielstraße/g)).toHaveLength(1);
    expect(JSON.stringify(recipient)).not.toMatch(/Beispiel|labelText/);
    expect(recipient).toMatchObject({ addressGiven: true });
    expect(JSON.stringify(s.events)).not.toMatch(/Beispiel/);
    // what is stored (and so what a saved copy of the state holds) has the address only encrypted, label included
    expect(JSON.stringify([...s.shipments.rows.values()])).not.toMatch(/Beispiel|10115/);
  });

  it("records the fee split as terms only (LOG-SHP-03)", async () => {
    const s = await shipping();
    expect(await s.logistics.setFeeSplit(s.deal.id, "fo", { senderPct: 50, recipientPct: 50 })).toEqual({ senderPct: 50, recipientPct: 50, note: undefined });
    await expect(s.logistics.setFeeSplit(s.deal.id, "fo", { senderPct: 70, recipientPct: 70 })).rejects.toMatchObject({ code: "invalid" });
    expect((await s.logistics.handoffCard(s.deal.id, "fw")) as { shipment?: { feeSplit?: unknown } }).toMatchObject({ shipment: { feeSplit: { senderPct: 50 } } });
  });

  it("tracks the shipment into the deal and completes the handoff on delivery (LOG-SHP-05, LOG-05)", async () => {
    const s = await shipping();
    await s.logistics.setShippingAddress(s.deal.id, "fw", ADDRESS);
    await s.logistics.createLabel(s.deal.id, "fo", window);
    s.advance(20); // still before the appointment starts
    expect(await s.logistics.refreshTracking(s.deal.id)).toBe("appointment_booked");
    s.advance(28); // appointment started
    expect(await s.logistics.refreshTracking(s.deal.id)).toBe("in_transit");
    expect(await s.logistics.refreshTracking(s.deal.id)).toBe("in_transit");
    s.advance(24 * 5);
    expect(await s.logistics.refreshTracking(s.deal.id)).toBe("delivered");
    expect(s.events.filter((e) => e.type === "ShipmentUpdated").map((e) => (e as { status: string }).status)).toEqual(["appointment_booked", "in_transit", "delivered"]);
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("completed");
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("done");
    expect(await s.logistics.handoffCard(s.deal.id, "fo")).toMatchObject({ state: "completed", outcome: { ok: true, by: "carrier" } });
  });
});

describe("logistics: outcomes", () => {
  it("records a completed handoff either owner marks, and items change hands (LOG-05, LOG-HND-04)", async () => {
    const s = await setup({ modes: ["pickup"] });
    await expect(s.logistics.markOutcome(s.deal.id, "fw", true)).rejects.toMatchObject({ code: "wrong_state" });
    await approveBoth(s);
    await s.logistics.markOutcome(s.deal.id, "fw", true);
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("completed");
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("done");
    expect(s.events.at(-1)).toMatchObject({ type: "HandoffFinished", ok: true });
    await expect(s.logistics.markOutcome(s.deal.id, "fo", true)).rejects.toMatchObject({ code: "wrong_state" });
  });

  it("needs a reason when the handoff did not happen, and puts the items back on the list", async () => {
    const s = await setup({ modes: ["pickup"] });
    await approveBoth(s);
    await expect(s.logistics.markOutcome(s.deal.id, "fo", false)).rejects.toMatchObject({ code: "invalid" });
    await expect(s.logistics.markOutcome(s.deal.id, "fo", false, "weather")).rejects.toMatchObject({ code: "invalid" });
    await s.logistics.markOutcome(s.deal.id, "fo", false, "no_show");
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("not_completed");
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("listed");
    expect(s.events.at(-1)).toMatchObject({ type: "HandoffFinished", ok: false });
  });
});

describe("logistics: no money", () => {
  it("contains no payment code (LOG-04)", () => {
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && !/\.test\.ts$/.test(p) && !/\.contract\.ts$/.test(p) && files.push(p); });
    walk("src/features/logistics");
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/\b(stripe|paypal|payout|checkout|chargeCard|processPayment|invoice|currency|amountCents|iban)\b/i);
    }
  });

  it("only ever creates zero-cost labels", async () => {
    const l = await createSimulatedCarrier().createLabel({ shipmentId: "x", fromDistrict: "n:a", toAddress: "Somewhere 1", toDistrict: "n:b", description: "d" });
    expect(l.costCents).toBe(0);
  });
});

describe("logistics: setup", () => {
  it("refuses to run without an encryption secret", async () => {
    const s = await setup();
    expect(() => createLogistics({ app: s.app, deals: s.negotiation, carrier: createSimulatedCarrier(), secret: "short", bus: s.bus, constraintsOf: () => ({ districtCode: "n:a", availability: [] }) })).toThrow();
    expect(LogisticsError).toBeTruthy();
  });
});
