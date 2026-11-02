import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appPageView } from "@/app/_composition/app-views";
import { memberActionsFor, memberStatusFor, memberStatusView } from "@/app/_composition/member-status";
import { loadApp } from "@/lib/app-config";
import { POST as createApp } from "./apps/route";
import { POST as join } from "./apps/[app]/join/route";
import { GET as waiting } from "./apps/[app]/waiting/route";
import { createTestApp, endWorld, resetWorld, startJacketDeal } from "./test-support";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : {} });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;

async function setup() {
  const cfg = { ...(await loadApp("garden-tools")), id: "club-s", name: "Club S", tagline: "Neighbours swap seeds" };
  const c = await createApp(post("/api/apps", cfg), ctx());
  const creator = { cookie: cookieOf(c), ...((await c.json()) as any) };
  const m = await join(post("/api/apps/club-s/join", { name: "Bo" }), ctx({ app: "club-s" }));
  const member = { cookie: cookieOf(m), ...((await m.json()) as any) };
  const o = await join(post("/api/apps/club-s/join", { name: "Cy" }), ctx({ app: "club-s" }));
  const other = { cookie: cookieOf(o), ...((await o.json()) as any) };
  return { creator, member, other };
}

describe("member status page (BR-43)", () => {
  afterEach(endWorld);
  beforeEach(() => resetWorld());

  it("shows a member their own page, and denies another member, the creator, a stranger and a forged cookie the same way", async () => {
    const { creator, member, other } = await setup();
    const mine = await memberStatusView("club-s", member.memberId, member.cookie);
    expect(mine.kind).toBe("ok");
    if (mine.kind === "ok") expect(mine.status.member).toMatchObject({ name: "Bo", role: "member" });
    expect((await memberStatusView("club-s", creator.memberId, creator.cookie)).kind).toBe("ok");
    for (const cookie of [other.cookie, creator.cookie, null, "agora_s_club-s=forged"]) {
      expect(await memberStatusView("club-s", member.memberId, cookie)).toEqual({ kind: "denied" });
    }
    // An id that does not exist, an app that does not exist and a repository example app (not a stored app) look the same.
    expect(await memberStatusView("club-s", "nope", member.cookie)).toEqual({ kind: "denied" });
    expect(await memberStatusView("missing-app", member.memberId, member.cookie)).toEqual({ kind: "denied" });
    expect(await memberStatusView("kids-gear", member.memberId, member.cookie)).toEqual({ kind: "denied" });
    // A session of another app does not open this one.
    expect(await memberStatusView("club-s", member.memberId, member.cookie.replace("agora_s_club-s", "agora_s_other"))).toEqual({ kind: "denied" });
  });

  it("has empty, working groups and an empty log for a new member", async () => {
    const { member } = await setup();
    const v = await memberStatusView("club-s", member.memberId, member.cookie);
    if (v.kind !== "ok") throw new Error("denied");
    const s = v.status;
    expect(s.waiting).toEqual({ questions: [], confirmations: [], offers: [] });
    expect([s.deals, s.items, s.lessons, s.rules, s.dealsByState, s.itemsByStatus]).toEqual([[], [], [], [], [], []]);
    expect(s.alone).toEqual({ agreedWithoutYou: 0, roundsHandled: 0, dealsRunning: 0 });
    expect(s.activity.counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(s.log).toEqual([]);
    expect(s.missing).toEqual([]);
  });

  it("writes each member their own log of what the agent did, in plain words, and serves it as their actions (BR-43, BR-44)", async () => {
    const t = await createTestApp();
    await startJacketDeal(t);
    const p = t.platform;
    const mine = await memberStatusFor(p, { id: t.b.id, name: "Jonas", role: "member" });
    const theirs = await memberStatusFor(p, { id: t.a.id, name: "Mia", role: "member" });
    // The wanting side: noted the need, found the fit, reached out. The offering side: listed, was approached.
    expect(mine.log.map((e) => e.kind)).toEqual(expect.arrayContaining(["listed", "found", "reached_out"]));
    expect(theirs.log.map((e) => e.kind)).toEqual(expect.arrayContaining(["listed", "approached"]));
    expect(mine.log[0]!.at >= mine.log[mine.log.length - 1]!.at).toBe(true); // newest first
    // Every step the agent took counts as activity, and the log never names the other member or carries message text.
    expect(mine.activity.counts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(mine.log.length);
    expect(JSON.stringify(mine.log)).not.toContain(t.a.id);
    expect(JSON.stringify(theirs.log)).not.toContain(t.b.id);
    const actions = await memberActionsFor(p, t.b.id, 5);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(5);
    expect(actions[0]!.what).toBe(mine.log[0]!.text);
    // The log is part of the app's saved state.
    expect(p.log.some((e) => e.memberId === t.b.id && e.kind === "reached_out")).toBe(true);
  });

  it("counts what waits for this phone's member, and only with that app's session", async () => {
    const t = await createTestApp();
    await startJacketDeal(t);
    const r = await waiting(t.get(t.a, `/api/apps/${t.appId}/waiting`), ctx({ app: t.appId }));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { questions: number; confirmations: number; total: number };
    expect(body.total).toBe(body.questions + body.confirmations);
    const a = await memberStatusFor(t.platform, { id: t.a.id, name: "", role: "member" });
    expect(body.total).toBe(a.waiting.questions.length + a.waiting.confirmations.length);
    expect((await waiting(new Request(`http://localhost/api/apps/${t.appId}/waiting`), ctx({ app: t.appId }))).status).toBe(401);
  });

  it("groups cards, deals, items and counts for a member who has them, and shows no message text or other member's id", async () => {
    const t = await createTestApp();
    await startJacketDeal(t);
    const p = t.platform;
    const s = await memberStatusFor(p, { id: t.b.id, name: "Jonas", role: "member" });
    expect(s.deals.length).toBeGreaterThan(0);
    expect(s.items.length).toBeGreaterThan(0);
    expect(s.dealsByState.reduce((n, x) => n + x.value, 0)).toBe(s.deals.length);
    expect(s.itemsByStatus.reduce((n, x) => n + x.value, 0)).toBe(s.items.length);
    expect(s.alone.dealsRunning).toBe(s.deals.filter((d) => d.open).length);
    expect(s.activity.counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    const json = JSON.stringify(s);
    expect(json).not.toContain(t.a.id);
    expect(json).not.toContain("simulated");
    const pending = async (id: string) => { const x = await memberStatusFor(p, { id, name: "", role: "member" }); return x.waiting.confirmations.length + x.waiting.questions.length; };
    expect((await pending(t.b.id)) + (await pending(t.a.id))).toBeGreaterThan(0);
    // The other member sees their own side only.
    const mia = await memberStatusFor(p, { id: t.a.id, name: "Mia", role: "member" });
    expect(JSON.stringify(mia)).not.toContain(t.b.id);
  });

  it("links the member and the creator to their own page from the app page", async () => {
    const { creator, member } = await setup();
    const m = await appPageView("club-s", member.cookie);
    const c = await appPageView("club-s", creator.cookie);
    expect(m.kind === "member" && m.memberId).toBe(member.memberId);
    expect(c.kind === "creator" && c.memberId).toBe(creator.memberId);
    expect(JSON.stringify(await appPageView("club-s", null))).not.toContain(member.memberId);
  });
});
