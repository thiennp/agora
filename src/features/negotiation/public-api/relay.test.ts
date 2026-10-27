import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createCatalogService } from "@/features/catalog/public-api/infrastructure";
import { createTrust, verifyEvidenceBundle } from "@/features/trust/public-api/infrastructure";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { recordEvents } from "@/hubs/DealEvents/query";
import { createNegotiationService, createRelay, NegotiationError, RelayError } from "./infrastructure";
import type { NegotiationMandate, RelayAudit } from "./types";

const t0 = new Date("2026-10-27T12:00:00Z");
const free: NegotiationMandate = { allowedTerms: ["free"], availability: [], language: "en" };

type Translate = (text: string, to: string) => { ok: true; text: string; uncertain?: boolean } | { ok: false };

async function setup(opts: { langs?: Record<string, string>; translate?: Translate } = {}) {
  const app = await loadApp("kids-gear");
  const bus = createDealEventBus();
  const events = recordEvents(bus).events;
  const gatekeeper = createGatekeeper({ app, now: () => t0 });
  const consent = new Set(["fo", "fw"]);
  const catalog = createCatalogService({ app, canShare: (f) => consent.has(f) });
  const offerItem = await catalog.items.create("fo", { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Jacket" });
  const wantItem = await catalog.items.create("fw", { kind: "want", category: "clothing", size: "68" });
  await catalog.items.list(offerItem.id);
  await catalog.items.list(wantItem.id);
  const audit: unknown[] = [];
  const trust = createTrust({ app, exportSecret: "test-secret-0123456789", audit: (e) => audit.push(e), now: () => t0 });
  const langs = opts.langs ?? {};
  const negotiation = createNegotiationService({
    app, items: catalog.items, gatekeeper, bus, now: () => t0, mandateOf: (f) => ({ ...free, language: langs[f] ?? "en" }),
    canStartDeal: (f) => trust.reputation.canStartDeal(f),
  });
  const language = opts.translate
    ? ({
        translate: async ({ text, to }: { text: string; to: string }) => { const r = opts.translate!(text, to); return r.ok ? { ok: true, text: r.text, from: null, to, uncertain: r.uncertain ?? false } : { ok: false, reason: "unavailable" }; },
        toEnglish: async (text: string) => { const r = opts.translate!(text, "en"); return r.ok ? r.text : null; },
      } as never)
    : undefined;
  const relayAudit: RelayAudit[] = [];
  const relay = createRelay({ deals: negotiation, trust, gatekeeper, languageOf: (f) => langs[f] ?? "en", language, bus, audit: (e) => relayAudit.push(e), now: () => t0 });
  const match = { offerItemId: offerItem.id, wantItemId: wantItem.id, offerFamilyId: "fo", wantFamilyId: "fw" };
  const deal = await negotiation.start(match);
  return { app, negotiation, relay, trust, catalog, deal, events, audit, relayAudit, offerItem, match };
}

describe("relay", () => {
  it("carries a message from one owner through their agent to the other owner (NEG-REL-01)", async () => {
    const s = await setup();
    const r = await s.relay.ownerSays(s.deal.id, "fw", "Is Saturday morning ok for you?");
    expect(r).toMatchObject({ status: "delivered", notice: null });
    const theirs = await s.relay.conversationFor(s.deal.id, "fo");
    expect(theirs).toHaveLength(1);
    expect(theirs[0]).toMatchObject({ direction: "received", text: "Is Saturday morning ok for you?" });
    const mine = await s.relay.conversationFor(s.deal.id, "fw");
    expect(mine[0]).toMatchObject({ direction: "sent", status: "delivered" });
  });

  it("removes contact details, tells the sender, and never shows the other owner the unredacted text (NEG-REL-03)", async () => {
    const s = await setup();
    const r = await s.relay.ownerSays(s.deal.id, "fw", "Call me on 0170 1234567 about Saturday");
    expect(r.status).toBe("redacted");
    expect(r.notice).toMatch(/details removed/);
    const theirs = JSON.stringify(await s.relay.conversationFor(s.deal.id, "fo"));
    expect(theirs).toContain("[number removed]");
    expect(theirs).not.toMatch(/0170/);
    expect((await s.relay.conversationFor(s.deal.id, "fw"))[0]).toMatchObject({ original: "Call me on 0170 1234567 about Saturday" });
  });

  it("blocks addresses and payment requests, delivers nothing, and lowers trust as signals build up", async () => {
    const s = await setup();
    const a = await s.relay.ownerSays(s.deal.id, "fw", "Pay me first via PayPal, hurry!");
    expect(a).toMatchObject({ status: "blocked" });
    expect(a.notice).toMatch(/payment requests/);
    expect(await s.relay.conversationFor(s.deal.id, "fo")).toEqual([]);
    expect(a.signals.level).not.toBe("none");
    expect(s.trust.reputation.status("fw").score).toBeLessThan(80);
    await s.relay.ownerSays(s.deal.id, "fw", "What's your address? I live at 12 Oak Street");
    const about = await s.relay.signalsAbout(s.deal.id, "fo");
    expect(about.signals.map((x) => x.id)).toContain("off_platform_payment");
    expect(about.signals.every((x) => x.explanation.length > 0)).toBe(true);
  });

  it("translates faithfully for the other owner and shows both versions (NEG-REL-02, NEG-REL-04)", async () => {
    const s = await setup({ langs: { fo: "de" }, translate: (t, to) => ({ ok: true, text: to === "de" ? "Ist Größe 68 noch da?" : t }) });
    await s.relay.ownerSays(s.deal.id, "fw", "Is size 68 still there?");
    const v = (await s.relay.conversationFor(s.deal.id, "fo"))[0];
    expect(v).toMatchObject({ direction: "received", text: "Ist Größe 68 noch da?", textLang: "de", originalFromSender: "Is size 68 still there?", originalLang: "en", translationFailed: false });
  });

  it("delivers the original and says so when translation fails, changes a number, or is unavailable", async () => {
    for (const translate of [
      () => ({ ok: false as const }),
      () => ({ ok: true as const, text: "Ist Größe 86 noch da?" }),
    ]) {
      const s = await setup({ langs: { fo: "de" }, translate });
      await s.relay.ownerSays(s.deal.id, "fw", "Is size 68 still there?");
      const v = (await s.relay.conversationFor(s.deal.id, "fo"))[0];
      expect(v).toMatchObject({ translationFailed: true, text: "Is size 68 still there?", textLang: "en" });
    }
    const none = await setup({ langs: { fo: "de" } });
    await none.relay.ownerSays(none.deal.id, "fw", "Hello there");
    expect((await none.relay.conversationFor(none.deal.id, "fo"))[0]).toMatchObject({ translationFailed: true });
  });

  it("holds a message when the translator introduces contact details", async () => {
    const s = await setup({ langs: { fo: "de" }, translate: (_t, to) => ({ ok: true, text: to === "de" ? "Hallo! Schreib mir an max@example.com" : "Hello" }) });
    const r = await s.relay.ownerSays(s.deal.id, "fw", "Hello! Write to me anytime");
    expect(r.status).toBe("blocked");
    expect(r.notice).toMatch(/Held/);
    expect(await s.relay.conversationFor(s.deal.id, "fo")).toEqual([]);
  });

  it("tells the receiver that chat cannot change terms when money or commitments come up", async () => {
    const s = await setup();
    await s.relay.ownerSays(s.deal.id, "fw", "Can you do 5 euros? Deal?");
    expect((await s.relay.conversationFor(s.deal.id, "fo"))[0]).toMatchObject({ notice: expect.stringMatching(/Nothing agreed in chat counts/) });
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("proposed");
  });

  it("checks who is talking, the deal state, the message and the rate (NFR-04)", async () => {
    const s = await setup();
    await expect(s.relay.ownerSays(s.deal.id, "stranger", "hi")).rejects.toMatchObject({ code: "not_a_party" });
    await expect(s.relay.ownerSays("missing", "fw", "hi")).rejects.toMatchObject({ code: "not_found" });
    await expect(s.relay.ownerSays(s.deal.id, "fw", "   ")).rejects.toMatchObject({ code: "invalid" });
    await expect(s.relay.ownerSays(s.deal.id, "fw", "x".repeat(1001))).rejects.toMatchObject({ code: "invalid" });
    await expect(s.relay.conversationFor(s.deal.id, "stranger")).rejects.toBeInstanceOf(RelayError);
    for (let i = 0; i < 30; i++) await s.relay.ownerSays(s.deal.id, "fw", `message ${i}`);
    await expect(s.relay.ownerSays(s.deal.id, "fw", "one more")).rejects.toMatchObject({ code: "rate_limited" });
    await s.negotiation.ownerDecision((await s.negotiation.run(s.deal.id)).id, "fo", "decline");
    await expect(s.relay.ownerSays(s.deal.id, "fo", "hello?")).rejects.toMatchObject({ code: "closed" });
  });

  it("logs every decision by kind and never by text (TRU-01)", async () => {
    const s = await setup();
    await s.relay.ownerSays(s.deal.id, "fw", "Call me on 0170 1234567");
    expect(s.relayAudit[0]).toMatchObject({ kind: "relay", status: "redacted", kinds: ["phone"] });
    expect(JSON.stringify([s.audit, s.relayAudit])).not.toMatch(/0170/);
  });

  it("files a report in two taps: evidence of hashes only, deal stopped, items freed, reporter hidden (TRU-RPT-01..04)", async () => {
    const s = await setup();
    await s.relay.ownerSays(s.deal.id, "fo", "Pay me first via PayPal please, urgent");
    await s.relay.ownerSays(s.deal.id, "fo", "Text me on telegram +49 170 1234567");
    await s.relay.ownerSays(s.deal.id, "fw", "That seems odd");
    const report = await s.relay.reportDeal(s.deal.id, "fw", "scam", "asked for PayPal");
    expect(report.bundle.count).toBe(3);
    expect(verifyEvidenceBundle(report.bundle)).toBe(true);
    expect(JSON.stringify(report.bundle)).not.toMatch(/PayPal|telegram|0170|odd/);
    expect(report.bundle.entries.map((e) => e.role)).toEqual(["reported", "reported", "reporter"]);
    expect(report.signals.map((x) => x.id)).toContain("off_platform_payment");
    expect((await s.negotiation.get(s.deal.id))?.state).toBe("reported");
    expect((await s.catalog.items.get(s.offerItem.id))?.status).toBe("listed");
    expect(s.events.at(-1)).toMatchObject({ type: "ReportFiled", reason: "scam" });
    expect(s.trust.reportsAbout("fo")).toEqual([{ status: "open" }]);
    await expect(s.relay.reportDeal(s.deal.id, "fw", "scam")).rejects.toThrow();
    await expect(s.relay.reportDeal(s.deal.id, "stranger", "scam")).rejects.toMatchObject({ code: "not_a_party" });
  });

  it("restricts and bans agents that build up reports and signals, and keeps them from starting deals (TRU-04)", async () => {
    const s = await setup();
    s.trust.reputation.record("fw", { type: "report_filed_against" });
    s.trust.reputation.record("fw", { type: "report_filed_against" });
    s.trust.reputation.record("fw", { type: "scam_signals", level: "high" });
    expect(s.trust.indicator("fw")).toBe("restricted");
    const second = await setup();
    second.trust.reputation.record("fw", { type: "report_filed_against" });
    second.trust.reputation.record("fw", { type: "report_filed_against" });
    second.trust.reputation.record("fw", { type: "scam_signals", level: "high" });
    const fresh = createNegotiationService({
      app: second.app, items: second.catalog.items, gatekeeper: createGatekeeper({ app: second.app }), bus: createDealEventBus(),
      mandateOf: () => free, canStartDeal: (f) => second.trust.reputation.canStartDeal(f),
    });
    await expect(fresh.start(second.match)).rejects.toBeInstanceOf(NegotiationError);
    await expect(fresh.start(second.match)).rejects.toMatchObject({ code: "not_allowed" });
    for (let i = 0; i < 2; i++) second.trust.reputation.record("fw", { type: "report_filed_against" });
    await expect(second.relay.ownerSays(second.deal.id, "fw", "hi")).rejects.toMatchObject({ code: "restricted" });
  });
});
