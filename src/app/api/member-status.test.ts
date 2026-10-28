import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { useAppStore } from "@/app/_composition/apps";
import { useIdentityStore } from "@/app/_composition/identity";
import { appPageView } from "@/app/_composition/app-views";
import { memberStatusFor, memberStatusView } from "@/app/_composition/member-status";
import { getPlatform } from "@/app/_composition/platform";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore } from "@/lib/identity";
import { POST as createApp } from "./apps/route";
import { POST as join } from "./apps/[app]/join/route";

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
  beforeEach(() => {
    resetRateLimit();
    useIdentityStore(createIdentityStore());
    useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  });

  it("shows a member their own page, and denies another member, the creator, a stranger and a forged cookie the same way", async () => {
    const { creator, member, other } = await setup();
    const mine = await memberStatusView("club-s", member.memberId, member.cookie);
    expect(mine.kind).toBe("ok");
    if (mine.kind === "ok") expect(mine.status.member).toMatchObject({ name: "Bo", role: "member" });
    expect((await memberStatusView("club-s", creator.memberId, creator.cookie)).kind).toBe("ok");
    for (const cookie of [other.cookie, creator.cookie, null, "agora_s_club-s=forged"]) {
      expect(await memberStatusView("club-s", member.memberId, cookie)).toEqual({ kind: "denied" });
    }
    // An id that does not exist, an app that does not exist and a demo app look the same.
    expect(await memberStatusView("club-s", "nope", member.cookie)).toEqual({ kind: "denied" });
    expect(await memberStatusView("missing-app", member.memberId, member.cookie)).toEqual({ kind: "denied" });
    expect(await memberStatusView("kids-gear", member.memberId, member.cookie)).toEqual({ kind: "denied" });
    // A session of another app does not open this one.
    expect(await memberStatusView("club-s", member.memberId, member.cookie.replace("agora_s_club-s", "agora_s_other"))).toEqual({ kind: "denied" });
  });

  it("has empty, working groups for a new member and says the audit log is missing", async () => {
    const { member } = await setup();
    const v = await memberStatusView("club-s", member.memberId, member.cookie);
    if (v.kind !== "ok") throw new Error("denied");
    const s = v.status;
    expect(s.waiting).toEqual({ questions: [], confirmations: [], offers: [] });
    expect([s.deals, s.items, s.lessons, s.rules, s.dealsByState, s.itemsByStatus]).toEqual([[], [], [], [], [], []]);
    expect(s.alone).toEqual({ agreedWithoutYou: 0, roundsHandled: 0, dealsRunning: 0 });
    expect(s.activity.counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(s.missing.join(" ")).toMatch(/audit log/);
  });

  it("groups cards, deals, items and counts for a member who has them, and shows no message text or other member's id", async () => {
    const p = await getPlatform("kids-gear");
    const s = await memberStatusFor(p, { id: "demo-jonas", name: "Jonas", role: "member" });
    expect(s.deals.length).toBeGreaterThan(0);
    expect(s.items.length).toBeGreaterThan(0);
    expect(s.dealsByState.reduce((n, x) => n + x.value, 0)).toBe(s.deals.length);
    expect(s.itemsByStatus.reduce((n, x) => n + x.value, 0)).toBe(s.items.length);
    expect(s.alone.dealsRunning).toBe(s.deals.filter((d) => d.open).length);
    expect(s.activity.counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    const json = JSON.stringify(s);
    expect(json).not.toContain("demo-mia");
    expect(json).not.toContain("simulated");
    const pending = async (id: string) => { const x = await memberStatusFor(p, { id, name: "", role: "member" }); return x.waiting.confirmations.length + x.waiting.questions.length; };
    expect((await pending("demo-jonas")) + (await pending("demo-mia"))).toBeGreaterThan(0);
    // The other persona sees their own side only.
    const mia = await memberStatusFor(p, { id: "demo-mia", name: "Mia", role: "member" });
    expect(JSON.stringify(mia)).not.toContain("demo-jonas");
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
