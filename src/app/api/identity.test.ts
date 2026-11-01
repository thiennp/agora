import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadApp } from "@/lib/app-config";
import { POST as createApp } from "./apps/route";
import { endWorld, resetWorld } from "./test-support";
import { POST as join } from "./apps/[app]/join/route";
import { GET as me } from "./apps/[app]/me/route";
import { GET as members } from "./apps/[app]/members/route";
import { POST as recover } from "./apps/[app]/recover/route";
import { POST as pairStart } from "./apps/[app]/pair/route";
import { POST as pairClaim } from "./apps/[app]/pair/claim/route";
import { POST as pairInfo } from "./apps/[app]/pair/info/route";
import { POST as pairApprove } from "./apps/[app]/pair/approve/route";
import { POST as signout } from "./apps/[app]/signout/route";
import { GET as getApp } from "./apps/[app]/route";
import { GET as listDeals } from "./deals/route";
import { POST as addItem } from "./items/route";
import { POST as answer } from "./owner-questions/[questionId]/answer/route";

const url = (p: string) => `http://localhost${p}`;
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const j = async (r: Response) => (await r.json()) as any;
const as = (cookie: string | undefined, path: string, body?: unknown) =>
  new Request(url(path), { method: body === undefined ? "GET" : "POST", body: body === undefined ? undefined : JSON.stringify(body), headers: cookie ? { cookie } : {} });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
const config = async (id: string) => ({ ...(await loadApp("garden-tools")), id, name: `Club ${id}` });

async function setup() {
  const c = await createApp(as(undefined, "/api/apps", await config("club-a")), ctx());
  const creator = { cookie: cookieOf(c), ...(await j(c)) };
  const m = await join(as(undefined, "/api/apps/club-a/join", { name: "Bo" }), ctx({ app: "club-a" }));
  const member = { cookie: cookieOf(m), res: m, ...(await j(m)) };
  return { creator, member };
}

describe("light identity over HTTP (BR-42, BR-45)", () => {
  afterEach(endWorld);
  beforeEach(() => resetWorld());

  it("makes the creator on create and a member on join, with a cookie that is HttpOnly and no secret in the body", async () => {
    const c = await createApp(as(undefined, "/api/apps", await config("club-a")), ctx());
    const header = c.headers.get("set-cookie")!;
    expect(header).toMatch(/^agora_s_club-a=[\w-]{43}; Path=\/; HttpOnly; SameSite=Lax/);
    expect(header).not.toContain("Secure"); // http in this test
    expect(c.headers.get("cache-control")).toBe("no-store");
    const body = await j(c);
    expect(body).toMatchObject({ role: "creator", notice: expect.stringContaining("not a real account") });
    expect(JSON.stringify(body)).not.toContain(header.split("=")[1]!.split(";")[0]!); // the session token is only in the cookie
    const secureReq = new Request("https://x.test/api/apps", { method: "POST", body: JSON.stringify(await config("club-s")) });
    expect((await createApp(secureReq, ctx())).headers.get("set-cookie")).toContain("; Secure");

    const dup = await createApp(as(undefined, "/api/apps", await config("club-a")), ctx());
    expect(dup.status).toBe(409); // no second creator, and no cookie
    expect(dup.headers.get("set-cookie")).toBeNull();
  });

  it("answers who I am from the cookie only, and 401s a missing, forged or other-app session", async () => {
    const { creator, member } = await setup();
    expect(await j(await me(as(creator.cookie, "/api/apps/club-a/me"), ctx({ app: "club-a" })))).toEqual({ memberId: creator.memberId, role: "creator" });
    expect(await j(await me(as(member.cookie, "/api/apps/club-a/me"), ctx({ app: "club-a" })))).toEqual({ memberId: member.memberId, role: "member" });
    const get = (cookie?: string, path = "/api/apps/club-a/me") => me(as(cookie, path), ctx({ app: path.split("/")[3]! }));
    expect((await get(undefined)).status).toBe(401);
    expect((await get("agora_s_club-a=forged")).status).toBe(401);
    expect((await get(`agora_s_club-a=${creator.memberId}`)).status).toBe(401);
    // Putting the secret in the URL does nothing: it is not read from there.
    expect((await get(undefined, `/api/apps/club-a/me?session=${creator.cookie.split("=")[1]}&token=${creator.cookie.split("=")[1]}`)).status).toBe(401);
    // A valid session of club-a is no session at all for another app, even if the cookie is renamed.
    await createApp(as(undefined, "/api/apps", await config("club-b")), ctx());
    expect((await get(creator.cookie, "/api/apps/club-b/me")).status).toBe(401);
    expect((await get(creator.cookie.replace("club-a", "club-b"), "/api/apps/club-b/me")).status).toBe(401);
  });

  it("joining twice from one phone keeps one membership", async () => {
    const { member } = await setup();
    const again = await join(as(member.cookie, "/api/apps/club-a/join", {}), ctx({ app: "club-a" }));
    expect(await j(again)).toEqual({ memberId: member.memberId, role: "member", alreadyMember: true });
    expect(again.headers.get("set-cookie")).toBeNull();
    expect((await join(as(undefined, "/api/apps/nope/join", {}), ctx({ app: "nope" }))).status).toBe(404);
  });

  it("lets only the creator list members; a member gets 403 and a stranger 401, and the public summary stays public", async () => {
    const { creator, member } = await setup();
    const list = (cookie?: string) => members(as(cookie, "/api/apps/club-a/members"), ctx({ app: "club-a" }));
    const ok = await list(creator.cookie);
    expect((await j(ok)).members.map((m: any) => m.name)).toEqual(["", "Bo"]);
    expect(JSON.stringify(await j(await list(creator.cookie)))).not.toContain(creator.recoveryCode);
    expect((await list(member.cookie)).status).toBe(403);
    expect((await list(undefined)).status).toBe(401);
    expect((await getApp(as(undefined, "/api/apps/club-a"), ctx({ app: "club-a" }))).status).toBe(200);
  });

  it("guards every platform route of a stored app by session, and refuses a request that names no stored app", async () => {
    const { creator, member } = await setup();
    const deals = (cookie?: string) => listDeals(as(cookie, "/api/deals?as=a&app=club-a"), ctx());
    expect((await deals(undefined)).status).toBe(401);
    expect((await deals("agora_s_club-a=forged")).status).toBe(401);
    expect((await deals(creator.cookie)).status).toBe(200);
    expect((await deals(member.cookie)).status).toBe(200);
    const item = { as: "a", kind: "offer", category: "hand-tools", condition: "good", description: "A good spade" };
    expect((await addItem(as(undefined, "/api/items?app=club-a", item), ctx())).status).toBe(401);
    expect((await addItem(as(member.cookie, "/api/items?app=club-a", item), ctx())).status).toBe(200);
    // Another app's session does not open this one.
    await createApp(as(undefined, "/api/apps", await config("club-b")), ctx());
    const other = await createApp(as(undefined, "/api/apps", await config("club-c")), ctx());
    expect((await deals(cookieOf(other).replace("club-c", "club-a"))).status).toBe(401);
    // There is no app without a session to fall back on: a request without ?app= is refused, and so is a repository example app (not a stored app).
    expect((await listDeals(as(undefined, "/api/deals?as=a"), ctx())).status).toBe(400);
    expect((await listDeals(as(creator.cookie, "/api/deals?as=a&app=kids-gear"), ctx())).status).toBe(404);
  });

  it("recovers on a new phone with the code: new session, old phone cut off, code replaced, wrong codes refused", async () => {
    const { member } = await setup();
    const rec = (code: string) => recover(as(undefined, "/api/apps/club-a/recover", { code }), ctx({ app: "club-a" }));
    const r = await rec(member.recoveryCode);
    expect(r.status).toBe(200);
    const body = await j(r);
    expect(body).toMatchObject({ memberId: member.memberId, role: "member" });
    expect(body.recoveryCode).not.toBe(member.recoveryCode);
    const fresh = cookieOf(r);
    expect(fresh).not.toBe(member.cookie);
    expect((await me(as(member.cookie, "/api/apps/club-a/me"), ctx({ app: "club-a" }))).status).toBe(401);
    expect((await me(as(fresh, "/api/apps/club-a/me"), ctx({ app: "club-a" }))).status).toBe(200);
    expect((await rec(member.recoveryCode)).status).toBe(401);
    expect((await rec("AAAAA-AAAAA-AAAAA-AAAAA")).status).toBe(401);
    expect((await recover(as(undefined, "/api/apps/club-zzz/recover", { code: body.recoveryCode }), ctx({ app: "club-zzz" }))).status).toBe(401);
  });

  it("rate limits recovery attempts hard", async () => {
    await setup();
    const rec = () => recover(as(undefined, "/api/apps/club-a/recover", { code: "AAAAA-AAAAA-AAAAA-AAAAA" }), ctx({ app: "club-a" }));
    for (let i = 0; i < 8; i++) expect((await rec()).status).toBe(401);
    expect((await rec()).status).toBe(429);
  });

  it("signs a new computer in when a signed-in device approves it with the four digits", async () => {
    const { member } = await setup();
    const c = ctx({ app: "club-a" });
    const start = await pairStart(new Request(url("/api/apps/club-a/pair"), { method: "POST", body: "{}", headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36" } }), c);
    const p = await j(start);
    expect(p.approveUrl).toContain(`/app/club-a/pair/${p.code}`);
    const claim = () => pairClaim(as(undefined, "/api/apps/club-a/pair/claim", { code: p.code, secret: p.secret }), c);
    expect(await j(await claim())).toEqual({ status: "pending" });
    // A stranger cannot look at or approve it.
    expect((await pairInfo(as(undefined, "/api/apps/club-a/pair/info", { code: p.code }), c)).status).toBe(401);
    expect((await pairApprove(as(undefined, "/api/apps/club-a/pair/approve", { code: p.code, verify: p.verify }), c)).status).toBe(401);
    expect(await j(await pairInfo(as(member.cookie, "/api/apps/club-a/pair/info", { code: p.code }), c))).toMatchObject({ label: "Chrome on Mac" });
    expect((await pairApprove(as(member.cookie, "/api/apps/club-a/pair/approve", { code: p.code, verify: "abcd" }), c)).status).toBe(400);
    expect((await pairApprove(as(member.cookie, "/api/apps/club-a/pair/approve", { code: p.code, verify: p.verify }), c)).status).toBe(200);
    const done = await claim();
    expect(await j(done)).toMatchObject({ status: "approved", memberId: member.memberId });
    const fresh = cookieOf(done);
    expect(fresh).not.toBe(member.cookie);
    expect((await me(as(fresh, "/api/apps/club-a/me"), c)).status).toBe(200);
    expect((await me(as(member.cookie, "/api/apps/club-a/me"), c)).status).toBe(200); // old device stays in
    expect((await claim()).status).toBe(400); // once only
  });

  it("signs out one phone and clears the cookie", async () => {
    const { member } = await setup();
    const out = await signout(as(member.cookie, "/api/apps/club-a/signout", {}), ctx({ app: "club-a" }));
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await me(as(member.cookie, "/api/apps/club-a/me"), ctx({ app: "club-a" }))).status).toBe(401);
  });

  it("never lets a non-session principal write: the route layer asserts a human on every write", async () => {
    // An external Muse would arrive with via "muse" (step 6); `assertHuman` is what every non-GET stored-app route runs.
    const { assertHuman } = await import("@/lib/identity");
    expect(() => assertHuman({ appId: "club-a", memberId: "m", role: "member", via: "muse" })).toThrow();
    // The owner-card answer route is behind the same guard: no session, no answer.
    await setup();
    const r = await answer(as(undefined, "/api/owner-questions/q1/answer?app=club-a", { as: "a", answer: "yes" }), ctx({ questionId: "q1" }));
    expect(r.status).toBe(401);
  });
});
