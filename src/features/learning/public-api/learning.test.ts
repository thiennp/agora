import { describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { createGatekeeper } from "@/features/gatekeeper/public-api/infrastructure";
import { createMandateBook, createMandateStore, eligibleStandingTopics } from "@/features/owner-cards/public-api/infrastructure";
import { createMatchService } from "@/features/matching/public-api/infrastructure";
import { createLocalProvider } from "@/features/memory/public-api/infrastructure";
import type { MemoryProvider } from "@/features/memory/public-api/types";
import { createDealEventBus } from "@/hubs/DealEvents/command";
import { createLearning, LearningError } from "./infrastructure";

const now = () => new Date("2026-10-27T12:00:00Z");

async function setup(opts: { memory?: MemoryProvider; stretchCooldown?: number } = {}) {
  const app = await loadApp("kids-gear");
  const bus = createDealEventBus();
  const memory = opts.memory ?? createLocalProvider();
  const gatekeeper = createGatekeeper({ app, now });
  const book = createMandateBook({ app, gatekeeper, store: createMandateStore(), now });
  const errors: { where: string; message: string }[] = [];
  const learning = createLearning({
    app, memory, bus, now, onError: (e) => errors.push(e), stretchCooldown: opts.stretchCooldown,
    dealInfo: async (dealId) => (dealId === "missing" ? null : { offerFamilyId: "fo", wantFamilyId: "fw", category: "clothing" }),
    rules: { eligibleTopics: () => eligibleStandingTopics(app), activeTopics: (f) => book.list(f).map((m) => m.topic), add: (i) => book.add(i) },
  });
  return { app, bus, memory, learning, book, gatekeeper, errors };
}
const decline = (bus: ReturnType<typeof createDealEventBus>, dealId: string, reasonCode?: string, familyId = "fw") => bus.publish({ type: "OwnerDecision", dealId, familyId, decision: "decline", reasonCode });

describe("learning from decisions", () => {
  it("turns a decline into a lesson, merges repeats, never counts one deal twice, and raises confidence (LRN-01, LRN-LES-02)", async () => {
    const s = await setup();
    decline(s.bus, "d1", "too_far");
    await s.learning.settled();
    decline(s.bus, "d1", "too_far");
    await s.learning.settled();
    let [l] = await s.learning.whatILearned("fw");
    expect(l).toMatchObject({ text: "Declined clothing deals because it was too far away.", seenTimes: 1, level: "tentative" });
    decline(s.bus, "d2", "too_far");
    await s.learning.settled();
    [l] = await s.learning.whatILearned("fw");
    expect(await s.learning.whatILearned("fw")).toHaveLength(1);
    expect(l).toMatchObject({ seenTimes: 2, level: "likely" });
    const stored = (await s.memory.getFamilyContext("fw")).lessons[0]!;
    expect(stored.evidenceDealIds).toEqual(["d1", "d2"]);
    expect(stored.confidence).toBe(0.75);
  });

  it("learns from confirmations too, and ignores a decline without a known reason", async () => {
    const s = await setup();
    s.bus.publish({ type: "OwnerDecision", dealId: "d1", familyId: "fo", decision: "confirm" });
    decline(s.bus, "d2", undefined, "fo");
    await s.learning.settled();
    expect((await s.learning.whatILearned("fo")).map((x) => x.text)).toEqual(["Confirmed clothing deals."]);
  });

  it("tightens an owner's limits only after confident lessons, and never beyond the base (LRN-02)", async () => {
    const s = await setup();
    const base = { maxDistanceKm: 10, blockedCategories: ["toys"] };
    decline(s.bus, "d1", "too_far");
    await s.learning.settled();
    expect(await s.learning.limitsFor("fw", base)).toMatchObject({ maxDistanceKm: 10 });
    decline(s.bus, "d2", "too_far");
    decline(s.bus, "d3", "condition");
    decline(s.bus, "d4", "condition");
    decline(s.bus, "d5", "wrong_size");
    decline(s.bus, "d6", "wrong_size");
    await s.learning.settled();
    expect(await s.learning.limitsFor("fw", { ...base, minCondition: "worn" })).toEqual({ maxDistanceKm: 7, blockedCategories: ["toys"], minCondition: "good", strictSizeCategories: ["clothing"] });
    expect(await s.learning.limitsFor("other", base)).toMatchObject({ maxDistanceKm: 10 });
    const m = await s.learning.tightenMandate("fw", { allowedTerms: ["free"], availability: [], language: "en", minCondition: "good" });
    expect(m.minCondition).toBe("like-new");
    expect(m.allowedTerms).toEqual(["free"]);
  });

  it("changes what matching returns once lessons are confident", async () => {
    const s = await setup();
    const matcher = (limits: (f: string) => { maxDistanceKm?: number; strictSizeCategories?: string[] }) => createMatchService({ app: s.app, now, limitsOf: limits });
    const item = { appId: "kids-gear", category: "clothing", size: "68", condition: "good", createdAt: now().toISOString() };
    const offer = { ...item, id: "o1", familyId: "fo", kind: "offer" as const, districtCode: "g:52.55:13.50" };
    const want = { ...item, id: "w1", familyId: "fw", kind: "want" as const, districtCode: "g:52.50:13.40" };
    const before = matcher(() => ({ maxDistanceKm: 10 }));
    before.onListed(offer);
    expect(before.candidatesFor(want).matches).toHaveLength(1);
    decline(s.bus, "d1", "too_far");
    decline(s.bus, "d2", "too_far");
    await s.learning.settled();
    const learned = await s.learning.limitsFor("fw", { maxDistanceKm: 10 });
    const after = matcher((f) => (f === "fw" ? learned : {}));
    after.onListed(offer);
    expect(after.candidatesFor(want).matches).toEqual([]);
  });

  it("stops using a lesson the moment the owner deletes it, and keeps families apart (LRN-03, LRN-LES-03)", async () => {
    const s = await setup();
    decline(s.bus, "d1", "too_far");
    decline(s.bus, "d2", "too_far");
    decline(s.bus, "d3", "price", "fo");
    await s.learning.settled();
    const [l] = await s.learning.whatILearned("fw");
    expect((await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).maxDistanceKm).toBe(7);
    expect(await s.learning.forget("fo", l!.id)).toBe(false);
    expect(await s.learning.forget("fw", l!.id)).toBe(true);
    expect((await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).maxDistanceKm).toBe(10);
    expect(await s.learning.whatILearned("fw")).toEqual([]);
    expect(await s.learning.whatILearned("fo")).toHaveLength(1);
  });

  it("cannot touch the gatekeeper: always-ask topics stay ask whatever was learned (LRN-04)", async () => {
    const s = await setup();
    for (let i = 0; i < 6; i++) decline(s.bus, `d${i}`, "price");
    for (let i = 0; i < 6; i++) s.bus.publish({ type: "OwnerAnswered", dealId: `q${i}`, familyId: "fw", topic: "price_terms", answer: "yes" });
    await s.learning.settled();
    expect(s.gatekeeper.evaluateIncoming({ familyId: "fw", text: "Can you do 5 euros?" }).outcome).toBe("ask");
    expect(s.learning.proposalsFor("fw")).toEqual([]);
  });
});

describe("deal outcomes in memory", () => {
  it("records outcomes for both families without duplicates (MEM-01)", async () => {
    const s = await setup();
    decline(s.bus, "d1", "price");
    s.bus.publish({ type: "DealDeclined", dealId: "d1", reason: "owner declined" });
    s.bus.publish({ type: "DealConfirmed", dealId: "d2", offerItemId: "i", wantItemId: "j" });
    s.bus.publish({ type: "HandoffFinished", dealId: "d2", ok: true });
    s.bus.publish({ type: "DealExpired", dealId: "d3" });
    await s.learning.settled();
    const fo = (await s.memory.getFamilyContext("fo")).recentOutcomes.map((o) => `${o.dealId}:${o.result}`);
    const fw = (await s.memory.getFamilyContext("fw")).recentOutcomes;
    expect(fo).toEqual(["d1:declined", "d2:confirmed", "d2:completed", "d3:expired"]);
    expect(fw.find((o) => o.dealId === "d1")).toMatchObject({ reasonCode: "price", category: "clothing" });
    expect((await s.memory.getFamilyContext("fo")).recentOutcomes.find((o) => o.dealId === "d1")?.reasonCode).toBeUndefined();
  });

  it("never blocks or throws when memory fails, and reports the failure (MEM-04)", async () => {
    const broken: MemoryProvider = {
      name: "broken", getFamilyContext: async () => { throw new Error("down"); }, recordLesson: async () => { throw new Error("down"); },
      deleteLesson: async () => { throw new Error("down"); }, recordDealOutcome: async () => { throw new Error("down"); }, eraseFamily: async () => { throw new Error("down"); },
    };
    const s = await setup({ memory: broken });
    decline(s.bus, "d1", "too_far");
    s.bus.publish({ type: "DealConfirmed", dealId: "d2", offerItemId: "i", wantItemId: "j" });
    await expect(s.learning.settled()).resolves.toBeUndefined();
    expect(await s.learning.whatILearned("fw")).toEqual([]);
    expect(await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).toMatchObject({ maxDistanceKm: 10 });
    expect(await s.learning.forget("fw", "x")).toBe(false);
    expect(s.errors.length).toBeGreaterThan(0);
    await expect(s.learning.eraseFamily("fw")).resolves.toBeUndefined();
  });

  it("erases everything about a family", async () => {
    const s = await setup();
    decline(s.bus, "d1", "too_far");
    await s.learning.settled();
    await s.learning.eraseFamily("fw");
    expect(await s.learning.whatILearned("fw")).toEqual([]);
    expect((await s.memory.getFamilyContext("fw")).recentOutcomes).toEqual([]);
  });
});

describe("standing-rule proposals", () => {
  const yes = (bus: ReturnType<typeof createDealEventBus>, topic: string, n: number, familyId = "fw") => {
    for (let i = 0; i < n; i++) bus.publish({ type: "OwnerAnswered", dealId: `q${i}`, familyId, topic, answer: "yes" });
  };

  it("proposes after three identical yes answers, once, in plain words (LRN-STR-01)", async () => {
    const s = await setup();
    yes(s.bus, "pickup_time_window", 2);
    expect(s.learning.proposalsFor("fw")).toEqual([]);
    yes(s.bus, "pickup_time_window", 1);
    yes(s.bus, "pickup_time_window", 2);
    const [p] = s.learning.proposalsFor("fw");
    expect(s.learning.proposalsFor("fw")).toHaveLength(1);
    expect(p!.text).toMatch(/pickup times 3 times in a row.*standing rule for 30 days/);
  });

  it("activates only when the owner accepts, with an expiry, and only for that owner (LRN-STR-02)", async () => {
    const s = await setup();
    yes(s.bus, "pickup_time_window", 3);
    const [p] = s.learning.proposalsFor("fw");
    expect(s.book.list("fw")).toEqual([]);
    expect(() => s.learning.acceptProposal("fo", p!.id)).toThrow(LearningError);
    s.learning.acceptProposal("fw", p!.id, 14);
    expect(s.book.list("fw")).toMatchObject([{ topic: "pickup_time_window", source: "learned_with_consent" }]);
    expect(() => s.learning.acceptProposal("fw", p!.id)).toThrow(/already/);
    yes(s.bus, "pickup_time_window", 3);
    expect(s.learning.proposalsFor("fw")).toEqual([]);
  });

  it("does not propose again after the owner dismisses it, and never for always-ask topics (LRN-STR-03)", async () => {
    const s = await setup();
    yes(s.bus, "pickup_time_window", 3);
    s.learning.dismissProposal("fw", s.learning.proposalsFor("fw")[0]!.id);
    yes(s.bus, "pickup_time_window", 5);
    expect(s.learning.proposalsFor("fw")).toEqual([]);
    for (const t of ["price_terms", "commitment", "location_reveal", "identity_reveal", "shipping_choice", "safety_exception"]) yes(s.bus, t, 5);
    expect(s.learning.proposalsFor("fw")).toEqual([]);
    expect(() => s.learning.dismissProposal("fw", "missing")).toThrow(LearningError);
  });
});

describe("stretch offers: relaxing a learned limit only with the owner's approval (LRN-09)", () => {
  const input = { wantItemId: "w1", offerItemId: "o1", counterpartFamilyId: "fo", category: "clothing", reasons: ["too_far" as const], shown: { distanceKm: 8.4, usualMaxKm: 7 } };
  const tighten2 = async (s: Awaited<ReturnType<typeof setup>>) => {
    decline(s.bus, "d1", "too_far");
    decline(s.bus, "d2", "too_far");
    await s.learning.settled();
  };

  it("asks in plain words without naming anyone, and starts nothing by itself", async () => {
    const s = await setup();
    const o = s.learning.offerStretch("fw", input)!;
    expect(o.text).toMatch(/about 8 km away, further than the 7 km you usually accept.*Do you want to look at it anyway\? Nothing is agreed/);
    expect(o.text).not.toMatch(/fo|f\d\d/);
    expect(s.learning.stretchOffersFor("fw")).toHaveLength(1);
    expect(s.learning.stretchOffersFor("fo")).toEqual([]);
    expect(s.learning.offerStretch("fw", input)!.id).toBe(o.id);
    expect(() => s.learning.offerStretch("fw", { ...input, reasons: [] })).toThrow(LearningError);
  });

  it("can ask every time when the back-off is switched off (experiments only)", async () => {
    const s = await setup({ stretchCooldown: 0 });
    const o = s.learning.offerStretch("fw", input)!;
    s.learning.answerStretch("fw", o.id, "no");
    expect(s.learning.offerStretch("fw", { ...input, offerItemId: "next" })).not.toBeNull();
  });

  it("limits how many offers wait at once, so owners are not nagged", async () => {
    const s = await setup();
    for (let i = 0; i < 3; i++) s.learning.offerStretch("fw", { ...input, offerItemId: `o${i}` });
    expect(() => s.learning.offerStretch("fw", { ...input, offerItemId: "o9" })).toThrow(/waiting questions/);
    const [first] = s.learning.stretchOffersFor("fw");
    s.learning.answerStretch("fw", first!.id, "yes");
    expect(() => s.learning.offerStretch("fw", { ...input, offerItemId: "o9" })).not.toThrow();
  });

  it("backs off after a no: the next five opportunities for that reason are skipped, other reasons are unaffected (LRN-10)", async () => {
    const s = await setup();
    const o = s.learning.offerStretch("fw", input)!;
    s.learning.answerStretch("fw", o.id, "no");
    for (let i = 0; i < 5; i++) expect(s.learning.offerStretch("fw", { ...input, offerItemId: `skip${i}` })).toBeNull();
    expect(s.learning.offerStretch("fw", { ...input, offerItemId: "sixth" })).not.toBeNull();
    expect(s.learning.offerStretch("fw", { ...input, offerItemId: "cond", reasons: ["condition"] })).not.toBeNull();
    expect(s.learning.offerStretch("other", { ...input, offerItemId: "x" })).not.toBeNull();
    // a yes clears the cooldown for its reasons
    const sixth = s.learning.stretchOffersFor("fw").find((x) => x.offerItemId === "sixth")!;
    s.learning.answerStretch("fw", sixth.id, "yes");
    expect(s.learning.offerStretch("fw", { ...input, offerItemId: "again" })).not.toBeNull();
  });

  it("checks the owner and the answer, and links a deal only to an accepted offer", async () => {
    const s = await setup();
    const o = s.learning.offerStretch("fw", input)!;
    expect(() => s.learning.answerStretch("fo", o.id, "yes")).toThrow(/someone else/);
    expect(() => s.learning.linkStretchDeal("fw", o.id, "d9")).toThrow(/has not approved/);
    expect(s.learning.answerStretch("fw", o.id, "yes").status).toBe("accepted");
    expect(() => s.learning.answerStretch("fw", o.id, "no")).toThrow(/already accepted/);
    expect(() => s.learning.linkStretchDeal("fo", o.id, "d9")).toThrow(/someone else/);
    expect(() => s.learning.linkStretchDeal("fw", o.id, "d9")).not.toThrow();
    const declined = s.learning.offerStretch("fw", { ...input, offerItemId: "o2" })!;
    s.learning.answerStretch("fw", declined.id, "no");
    expect(() => s.learning.linkStretchDeal("fw", declined.id, "d10")).toThrow(/has not approved/);
  });

  it("loosens the limit one step per approved and confirmed stretch deal, and never without one", async () => {
    const s = await setup();
    await tighten2(s);
    decline(s.bus, "d3", "too_far"); // three declines: a stretch deal outweighs two of them, so it takes two confirmed stretches to clear the limit
    await s.learning.settled();
    const base = { maxDistanceKm: 10 };
    expect((await s.learning.limitsFor("fw", base)).maxDistanceKm).toBe(7);
    // an offer the owner declines, or an accepted offer whose deal is not confirmed, loosens nothing
    // a declined offer on another reason, so it does not put the distance reason into its cooldown
    const no = s.learning.offerStretch("fw", { ...input, offerItemId: "o-no", reasons: ["condition"] })!;
    s.learning.answerStretch("fw", no.id, "no");
    s.bus.publish({ type: "DealConfirmed", dealId: "never-linked", offerItemId: "i", wantItemId: "j" });
    await s.learning.settled();
    expect((await s.learning.limitsFor("fw", base)).maxDistanceKm).toBe(7);

    const yes = s.learning.offerStretch("fw", input)!;
    s.learning.answerStretch("fw", yes.id, "yes");
    s.learning.linkStretchDeal("fw", yes.id, "stretch-1");
    s.bus.publish({ type: "DealConfirmed", dealId: "stretch-1", offerItemId: "i", wantItemId: "j" });
    await s.learning.settled();
    expect((await s.learning.limitsFor("fw", base)).maxDistanceKm).toBe(8.5);
    const lessons = await s.learning.whatILearned("fw");
    expect(lessons.map((l) => l.text)).toContain("Was happy to look beyond the usual distance limit for clothing deals.");

    const yes2 = s.learning.offerStretch("fw", { ...input, offerItemId: "o2" })!;
    s.learning.answerStretch("fw", yes2.id, "yes");
    s.learning.linkStretchDeal("fw", yes2.id, "stretch-2");
    s.bus.publish({ type: "DealConfirmed", dealId: "stretch-2", offerItemId: "i", wantItemId: "j" });
    await s.learning.settled();
    expect((await s.learning.limitsFor("fw", base)).maxDistanceKm).toBe(10);
  });

  it("tightens again after new declines, and lets the owner delete the stretch lesson to tighten at once", async () => {
    const s = await setup();
    await tighten2(s);
    for (const i of [1, 2]) {
      const o = s.learning.offerStretch("fw", { ...input, offerItemId: `o${i}` })!;
      s.learning.answerStretch("fw", o.id, "yes");
      s.learning.linkStretchDeal("fw", o.id, `st-${i}`);
      s.bus.publish({ type: "DealConfirmed", dealId: `st-${i}`, offerItemId: "i", wantItemId: "j" });
    }
    await s.learning.settled();
    expect((await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).maxDistanceKm).toBe(10);
    for (const d of ["d3", "d4", "d5"]) decline(s.bus, d, "too_far");
    await s.learning.settled();
    expect((await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).maxDistanceKm).toBe(8.5);
    const stretchLesson = (await s.learning.whatILearned("fw")).find((l) => /beyond the usual/.test(l.text))!;
    await s.learning.forget("fw", stretchLesson.id);
    expect((await s.learning.limitsFor("fw", { maxDistanceKm: 10 })).maxDistanceKm).toBe(7);
  });

  it("cannot touch always-ask topics, and erasing the family removes its offers", async () => {
    const s = await setup();
    const o = s.learning.offerStretch("fw", input)!;
    s.learning.answerStretch("fw", o.id, "yes");
    expect(s.gatekeeper.evaluateIncoming({ familyId: "fw", text: "Can you do 5 euros?" }).outcome).toBe("ask");
    await s.learning.eraseFamily("fw");
    expect(s.learning.stretchOffersFor("fw")).toEqual([]);
    expect(() => s.learning.linkStretchDeal("fw", o.id, "d1")).toThrow(/not found/);
  });
});
