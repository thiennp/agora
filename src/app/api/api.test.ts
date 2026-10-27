import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { POST as reset } from "./demo/reset/route";
import { GET as listDeals } from "./deals/route";
import { GET as getDeal } from "./deals/[dealId]/route";
import { POST as confirm } from "./deals/[dealId]/confirm/route";
import { POST as relay } from "./deals/[dealId]/relay/route";
import { POST as handoff } from "./deals/[dealId]/handoff/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";
import { POST as learning } from "./owner/learning/route";
import { POST as report } from "./reports/route";
import { GET as dashboard } from "./dashboard/route";

const url = (path: string) => `http://localhost${path}`;
const post = (path: string, body: unknown) => new Request(url(path), { method: "POST", body: JSON.stringify(body) });
const get = (path: string) => new Request(url(path));
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;

/** Everything a page does goes through these handlers, so this is the whole owner journey without a browser. */
async function fresh() {
  resetRateLimit();
  const { dealId } = await j(await reset(post("/api/demo/reset", {}), ctx({})));
  return dealId as string;
}
const deals = async (as: "a" | "b") => (await j(await listDeals(get(`/api/deals?as=${as}`), ctx({})))).deals as any[];
const view = async (id: string, as: "a" | "b") => j(await getDeal(get(`/api/deals/${id}?as=${as}`), ctx({ dealId: id })));

describe("demo API", () => {
  beforeEach(() => resetRateLimit());

  it("starts a real scenario: a match, an offer, and the agent pausing to ask the owner who has free hours", async () => {
    const id = await fresh();
    expect((await deals("a"))[0]).toMatchObject({ id, role: "giving", state: "awaiting_owner_input" });
    expect((await deals("b"))[0]).toMatchObject({ id, role: "receiving" });
    const v = await view(id, "a");
    expect(v.summary).toMatch(/needs your answer/);
    expect(v.item).toContain("Winter jacket");
    expect(v.history.map((h: any) => h.to)).toEqual(["proposed", "awaiting_owner_input"]);
  });

  it("takes a deal from question to confirmed to a handover plan, with each owner acting only on their own cards", async () => {
    const id = await fresh();
    const { cards } = await import("@/app/_composition/platform").then(async (m) => (await m.getPlatform()));
    const miaQuestion = cards.questionsFor("demo-mia")[0]!;
    expect(miaQuestion.topic).toBe("pickup_time_window");
    // Jonas cannot answer Mia's question; Mia can.
    const wrong = await answer(post("/x", { as: "b", answer: "yes" }), ctx({ questionId: miaQuestion.id }));
    expect(wrong.status).toBe(403);
    expect((await j(wrong)).error.code).toBe("not_owner");
    const ok = await answer(post("/x", { as: "a", answer: "yes" }), ctx({ questionId: miaQuestion.id }));
    expect(ok.status).toBe(200);
    expect((await j(ok)).state).toMatch(/awaiting_owners|awaiting_owner_input/);

    const platform = await import("@/app/_composition/platform").then((m) => m.getPlatform());
    for (let i = 0; i < 4 && platform.cards.questionsFor("demo-jonas").length + platform.cards.questionsFor("demo-mia").length > 0; i++) {
      for (const who of ["demo-mia", "demo-jonas"] as const) for (const q of platform.cards.questionsFor(who)) await answer(post("/x", { as: who === "demo-mia" ? "a" : "b", answer: "yes" }), ctx({ questionId: q.id }));
    }
    const miaCard = platform.cards.confirmationsFor("demo-mia")[0]!;
    const jonasCard = platform.cards.confirmationsFor("demo-jonas")[0]!;
    expect((await confirm(post("/x", { as: "b", cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id }))).status).toBe(403);
    expect((await j(await confirm(post("/x", { as: "a", cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id })))).state).toBe("awaiting_owners");
    const done = await confirm(post("/x", { as: "b", cardId: jonasCard.id, decision: "confirm", reason: { code: "timing" } }), ctx({ dealId: id }));
    expect((await j(done)).state).toBe("confirmed");
    const plan = (await view(id, "b")).handoff;
    expect(plan).toMatchObject({ empty: false, state: "proposed" });
    expect(plan.checklist.length).toBeGreaterThan(3);
    expect((await confirm(post("/x", { as: "a", cardId: miaCard.id, decision: "confirm" }), ctx({ dealId: id }))).status).toBe(409);

    // the handover: both approve, and the deal moves to handoff; the outcome is recorded
    for (const as of ["a", "b"] as const) expect((await handoff(post("/x", { as, action: "approve" }), ctx({ dealId: id }))).status).toBe(200);
    expect((await view(id, "a")).deal.state).toBe("handoff");
    expect((await handoff(post("/x", { as: "a", action: "outcome", ok: false }), ctx({ dealId: id }))).status).toBe(400);
    expect((await handoff(post("/x", { as: "b", action: "outcome", ok: true }), ctx({ dealId: id }))).status).toBe(200);
    expect((await view(id, "a")).deal.state).toBe("completed");
  });

  it("relays chat through each owner's agent: screened, translated (simulated), and honest about what it did", async () => {
    const id = await fresh();
    const sent = await j(await relay(post("/x", { as: "a", text: "Call me on 0170 1234567 about Saturday" }), ctx({ dealId: id })));
    expect(sent).toMatchObject({ status: "redacted" });
    expect(sent.notice).toMatch(/details removed/);
    const blocked = await j(await relay(post("/x", { as: "a", text: "Please pay first via PayPal" }), ctx({ dealId: id })));
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
    const id = await fresh();
    const r = await report(post("/api/reports", { as: "b", dealId: id, reason: "scam", note: "asked for money" }), ctx({}));
    expect(r.status).toBe(200);
    expect((await j(r)).evidenceEntries).toBe(0);
    expect((await view(id, "a")).deal.state).toBe("reported");
    const again = await report(post("/api/reports", { as: "b", dealId: id, reason: "scam" }), ctx({}));
    expect([409, 400]).toContain(again.status);
    expect((await j(again)).error.code).toBeTruthy();
  });

  it("shows what was learned, lets the owner delete it, and records a decline's reason", async () => {
    const id = await fresh();
    const platform = await import("@/app/_composition/platform").then((m) => m.getPlatform());
    // Mia is asked about her pickup window, then Jonas's agent counters with the shared part and asks him too.
    for (let i = 0; i < 4; i++) {
      for (const [who, as] of [["demo-mia", "a"], ["demo-jonas", "b"]] as const) for (const q of platform.cards.questionsFor(who)) await answer(post("/x", { as, answer: "yes" }), ctx({ questionId: q.id }));
    }
    const jonasCard = platform.cards.confirmationsFor("demo-jonas")[0]!;
    await confirm(post("/x", { as: "b", cardId: jonasCard.id, decision: "decline", reason: { code: "too_far" } }), ctx({ dealId: id }));
    const lessons = await platform.learning.whatILearned("demo-jonas");
    expect(lessons.map((l) => l.text)).toEqual(["Declined clothing deals because it was too far away."]);
    expect((await j(await learning(post("/x", { as: "b", action: "forget", id: lessons[0]!.id }), ctx({})))).ok).toBe(true);
    expect(await platform.learning.whatILearned("demo-jonas")).toEqual([]);
    expect((await learning(post("/x", { as: "a", action: "forget", id: "missing" }), ctx({}))).status).toBe(200);
  });

  it("answers errors in one stable shape, and refuses bad input", async () => {
    const id = await fresh();
    const bad = await relay(post("/x", { as: "c", text: "hi" }), ctx({ dealId: id }));
    expect(bad.status).toBe(400);
    expect(await j(bad)).toEqual({ error: { code: "invalid_input", message: expect.stringContaining("as") } });
    expect((await relay(post("/x", { as: "a", text: "" }), ctx({ dealId: id }))).status).toBe(400);
    expect((await relay(post("/x", { as: "a", text: "x".repeat(1001) }), ctx({ dealId: id }))).status).toBe(400);
    const notJson = await relay(new Request(url("/x"), { method: "POST", body: "{nope" }), ctx({ dealId: id }));
    expect((await j(notJson)).error.code).toBe("invalid_json");
    const missing = await relay(post("/x", { as: "a", text: "hello" }), ctx({ dealId: "no-such-deal" }));
    expect(missing.status).toBe(404);
    expect((await getDeal(get("/api/deals/no-such?as=a"), ctx({ dealId: "no-such" }))).status).toBe(404);
  });

  it("limits how fast one caller can hit the API, and tells them when to retry", async () => {
    await fresh();
    let last: Response | undefined;
    for (let i = 0; i < 125; i++) last = await listDeals(get("/api/deals?as=a"), ctx({}));
    expect(last!.status).toBe(429);
    expect((await j(last!)).error.code).toBe("rate_limited");
    expect(last!.headers.get("retry-after")).toBeTruthy();
  });

  it("is demo-only: in live mode there are no accounts, so everything is refused", async () => {
    await fresh();
    const prev = process.env.AGORA_MODE;
    process.env.AGORA_MODE = "live";
    try {
      const r = await listDeals(get("/api/deals?as=a"), ctx({}));
      expect(r.status).toBe(501);
      expect((await j(r)).error.code).toBe("auth_not_built");
    } finally {
      if (prev === undefined) delete process.env.AGORA_MODE;
      else process.env.AGORA_MODE = prev;
    }
  });

  it("serves the dashboard from the simulation's CSV files, labelled as simulated", async () => {
    const d = await j(await dashboard(get("/api/dashboard?scenario=stable"), ctx({})));
    expect(d.label).toMatch(/^SIMULATED/);
    expect(d.rows).toHaveLength(8);
    expect(d.rows[0]).toMatchObject({ round: 1, simulated: 1 });
    expect(d.rows.at(-1).approval_on_mean).toBeGreaterThan(d.rows.at(-1).approval_off_mean + 0.15);
    expect(d.headroom.cardsPerConfirmed.on).toBeLessThan(d.headroom.cardsPerConfirmed.off);
    expect(d.notes.join(" ")).toMatch(/Cost per deal is not measured/);
    expect((await dashboard(get("/api/dashboard?scenario=nope"), ctx({}))).status).toBe(400);
  }, 60000);
});
