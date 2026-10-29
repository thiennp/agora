import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as listDeals } from "./deals/route";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { POST as handoff } from "./deals/[dealId]/handoff/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";
import { POST as learning } from "./owner/learning/route";
import { POST as report } from "./reports/route";
import { GET as dashboard } from "./dashboard/route";
import { POST as addItem } from "./items/route";
import { createTestApp, ctx, endWorld, j, pinClockAfterLimitsLift, resetWorld, startJacketDeal, type Member, type TestApp } from "./test-support";

const url = (path: string) => `http://localhost${path}`;
const get = (path: string) => new Request(url(path));

/** Everything a page does goes through these handlers, so this is the whole owner journey without a browser. Two members of one created app, each with their own session. */
let t: TestApp;
let id: string;
const who = (k: "a" | "b"): Member => t[k];
const deals = async (as: "a" | "b") => (await j(await listDeals(t.get(who(as), "/api/deals"), ctx()))).deals as any[];
const view = async (dealId: string, as: "a" | "b") => j(await getDeal(t.get(who(as), `/api/deals/${dealId}`), ctx({ dealId })));

describe("API", () => {
  afterEach(endWorld);
  beforeEach(async () => {
    resetWorld();
    t = await createTestApp();
    id = (await startJacketDeal(t)).dealId;
  });

  it("starts a real scenario: a match, an offer, and the agent pausing to ask the owner who has free hours", async () => {
    expect((await deals("a"))[0]).toMatchObject({ id, role: "giving", state: "awaiting_owner_input" });
    expect((await deals("b"))[0]).toMatchObject({ id, role: "receiving" });
    const v = await view(id, "a");
    expect(v.summary).toMatch(/needs your answer/);
    expect(v.item).toContain("Winter jacket");
    expect(v.history.map((h: any) => h.to)).toEqual(["proposed", "awaiting_owner_input"]);
  });

  it("takes a deal from question to confirmed to a handover plan, with each owner acting only on their own cards", async () => {
    const { cards } = t.platform;
    const miaQuestion = cards.questionsFor(t.a.id)[0]!;
    expect(miaQuestion.topic).toBe("pickup_time_window");
    // Jonas cannot answer Mia's question; Mia can.
    const wrong = await answer(t.post(t.b, "/x", { answer: "yes" }), ctx({ questionId: miaQuestion.id }));
    expect(wrong.status).toBe(403);
    expect((await j(wrong)).error.code).toBe("not_owner");
    const ok = await answer(t.post(t.a, "/x", { answer: "yes" }), ctx({ questionId: miaQuestion.id }));
    expect(ok.status).toBe(200);
    expect((await j(ok)).state).toMatch(/awaiting_owners|awaiting_owner_input/);

    for (let i = 0; i < 4 && cards.questionsFor(t.b.id).length + cards.questionsFor(t.a.id).length > 0; i++) {
      for (const m of [t.a, t.b]) for (const q of cards.questionsFor(m.id)) await answer(t.post(m, "/x", { answer: "yes" }), ctx({ questionId: q.id }));
    }
    const miaCard = cards.confirmationsFor(t.a.id)[0]!;
    const jonasCard = cards.confirmationsFor(t.b.id)[0]!;
    expect((await confirm(t.post(t.b, "/x", { cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id }))).status).toBe(403);
    expect((await j(await confirm(t.post(t.a, "/x", { cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id })))).state).toBe("awaiting_owners");
    const done = await confirm(t.post(t.b, "/x", { cardId: jonasCard.id, decision: "confirm", reason: { code: "timing" } }), ctx({ dealId: id }));
    expect((await j(done)).state).toBe("confirmed");
    const plan = (await view(id, "b")).handoff;
    expect(plan).toMatchObject({ empty: false, state: "proposed" });
    expect(plan.checklist.length).toBeGreaterThan(3);
    expect((await confirm(t.post(t.a, "/x", { cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id }))).status).toBe(409);

    // the handover: both approve, and the deal moves to handoff; the outcome is recorded
    for (const m of [t.a, t.b]) expect((await handoff(t.post(m, "/x", { action: "approve" }), ctx({ dealId: id }))).status).toBe(200);
    expect((await view(id, "a")).deal.state).toBe("handoff");
    expect((await handoff(t.post(t.a, "/x", { action: "outcome", ok: false }), ctx({ dealId: id }))).status).toBe(400);
    expect((await handoff(t.post(t.b, "/x", { action: "outcome", ok: true }), ctx({ dealId: id }))).status).toBe(200);
    expect((await view(id, "a")).deal.state).toBe("completed");
  });

  it("relays chat through each owner's agent: screened, translated (stood-in model), and honest about what it did", async () => {
    // Jonas reads German: the relay translates for him. Everyone else in the app keeps the app's first language.
    t.platform.byId.get(t.b.id)!.language = "de";
    const sent = await j(await relay(t.post(t.a, "/x", { text: "Call me on 0170 1234567 about Saturday" }), ctx({ dealId: id })));
    expect(sent).toMatchObject({ status: "redacted" });
    expect(sent.notice).toMatch(/details removed/);
    const blocked = await j(await relay(t.post(t.a, "/x", { text: "Please pay first via PayPal" }), ctx({ dealId: id })));
    expect(blocked.status).toBe("blocked");
    const jonas = (await view(id, "b")).conversation;
    expect(jonas).toHaveLength(1);
    expect(JSON.stringify(jonas)).not.toMatch(/0170|PayPal/);
    expect(jonas[0].text).toMatch(/^\[simulated de\] .*\[number removed\]/);
    expect(jonas[0].originalFromSender).toContain("[number removed]");
    const mine = (await view(id, "a")).conversation;
    expect(mine[0]).toMatchObject({ direction: "sent", original: "Call me on 0170 1234567 about Saturday" });
  });

  it("stops a deal when reported, keeps the reporter hidden, and refuses a second report", async () => {
    const r = await report(t.post(t.b, "/api/reports", { dealId: id, reason: "scam", note: "asked for money" }), ctx());
    expect(r.status).toBe(200);
    expect((await j(r)).evidenceEntries).toBe(0);
    expect((await view(id, "a")).deal.state).toBe("reported");
    const again = await report(t.post(t.b, "/api/reports", { dealId: id, reason: "scam" }), ctx());
    expect([409, 400]).toContain(again.status);
    expect((await j(again)).error.code).toBeTruthy();
  });

  it("shows what was learned, lets the owner delete it, and records a decline's reason", async () => {
    const platform = t.platform;
    // Mia is asked about her pickup window, then Jonas's agent counters with the shared part and asks him too.
    for (let i = 0; i < 4; i++) {
      for (const m of [t.a, t.b]) for (const q of platform.cards.questionsFor(m.id)) await answer(t.post(m, "/x", { answer: "yes" }), ctx({ questionId: q.id }));
    }
    const jonasCard = platform.cards.confirmationsFor(t.b.id)[0]!;
    await confirm(t.post(t.b, "/x", { cardId: jonasCard.id, decision: "decline", reason: { code: "too_far" } }), ctx({ dealId: id }));
    const lessons = await platform.learning.whatILearned(t.b.id);
    expect(lessons.map((l) => l.text)).toEqual(["Declined clothing deals because it was too far away."]);
    expect((await j(await learning(t.post(t.b, "/x", { action: "forget", id: lessons[0]!.id }), ctx()))).ok).toBe(true);
    expect(await platform.learning.whatILearned(t.b.id)).toEqual([]);
    expect((await learning(t.post(t.a, "/x", { action: "forget", id: "missing" }), ctx())).status).toBe(200);
  });

  it("answers errors in one stable shape, and refuses bad input", async () => {
    const bad = await relay(t.post(t.a, "/x", { as: "c", text: "hi" }), ctx({ dealId: id }));
    expect(bad.status).toBe(400);
    expect(await j(bad)).toEqual({ error: { code: "invalid_input", message: expect.stringContaining("as") } });
    expect((await relay(t.post(t.a, "/x", { text: "" }), ctx({ dealId: id }))).status).toBe(400);
    expect((await relay(t.post(t.a, "/x", { text: "x".repeat(1001) }), ctx({ dealId: id }))).status).toBe(400);
    const notJson = await relay(new Request(url(`/x?app=${t.appId}`), { method: "POST", body: "{nope", headers: { cookie: t.a.cookie } }), ctx({ dealId: id }));
    expect((await j(notJson)).error.code).toBe("invalid_json");
    const missing = await relay(t.post(t.a, "/x", { text: "hello" }), ctx({ dealId: "no-such-deal" }));
    expect(missing.status).toBe(404);
    expect((await getDeal(t.get(t.a, "/api/deals/no-such"), ctx({ dealId: "no-such" }))).status).toBe(404);
  });

  it("limits how fast one caller can hit the API, and tells them when to retry", async () => {
    pinClockAfterLimitsLift(); // the limits are lifted until the end of November 2026
    let last: Response | undefined;
    for (let i = 0; i < 125; i++) last = await listDeals(t.get(t.a, "/api/deals"), ctx());
    expect(last!.status).toBe(429);
    expect((await j(last!)).error.code).toBe("rate_limited");
    expect(last!.headers.get("retry-after")).toBeTruthy();
  });

  it("needs a stored app and its member: no app, an unknown app, a repository example app and no session are all refused", async () => {
    const no = await listDeals(get("/api/deals"), ctx());
    expect(no.status).toBe(400);
    expect((await j(no)).error.code).toBe("app_required");
    expect((await listDeals(get("/api/deals?app=ghost-app"), ctx())).status).toBe(404);
    expect((await listDeals(get("/api/deals?app=kids-gear"), ctx())).status).toBe(404); // a repository example is not a running app
    expect((await listDeals(get(`/api/deals?app=${t.appId}`), ctx())).status).toBe(401);
  });

  it("starts an app empty: no deals and no items until its members make some", async () => {
    const other = await createTestApp();
    expect((await j(await listDeals(other.get(other.a, "/api/deals"), ctx()))).deals).toEqual([]);
    expect((await j(await listDeals(other.get(other.b, "/api/deals"), ctx()))).deals).toEqual([]);
    // an item made in the first app is not in the second
    const item = await j(await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "toys", condition: "good", description: "Blocks" }), ctx()));
    expect(await t.platform.catalog.items.get(item.id)).toBeTruthy();
    expect(await other.platform.catalog.items.get(item.id)).toBeFalsy();
  });

  it("serves the dashboard from the simulation's CSV files, labelled as simulated", async () => {
    const d = await j(await dashboard(t.get(t.a, "/api/dashboard?scenario=stable"), ctx()));
    expect(d.label).toMatch(/^SIMULATED/);
    expect(d.rows).toHaveLength(8);
    expect(d.rows[0]).toMatchObject({ round: 1, simulated: 1 });
    expect(d.rows.at(-1).approval_on_mean).toBeGreaterThan(d.rows.at(-1).approval_off_mean + 0.15);
    expect(d.headroom.cardsPerConfirmed.on).toBeLessThan(d.headroom.cardsPerConfirmed.off);
    expect(d.notes.join(" ")).toMatch(/Cost per deal is not measured/);
    expect((await dashboard(t.get(t.a, "/api/dashboard?scenario=nope"), ctx())).status).toBe(400);
  }, 60000);
});

describe("safety checks", () => {
  it("runs the repository's red-team and screening sets and reports none missed", async () => {
    const { runSafetyChecks } = await import("@/app/_composition/safety-checks");
    const checks = await runSafetyChecks();
    expect(checks.map((c) => c.id)).toEqual(["injection", "pressure", "scams", "topics", "leaks", "benign", "scam-signals"]);
    for (const c of checks) {
      expect(c.cases, c.id).toBeGreaterThan(0);
      expect(c.failures, c.id).toEqual([]);
    }
  });
});
