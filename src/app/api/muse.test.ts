import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endWorld, resetWorld } from "./test-support";
import { resetMuseRateLimits } from "@/app/_composition/muse-api";
import { museOpenApi } from "@/app/_composition/muse-openapi";
import { loadApp } from "@/lib/app-config";
import { sha256Hex } from "@/lib/crypto";
import { createMuseKeyStore } from "@/lib/identity";
import { POST as createApp } from "./apps/route";
import { POST as join } from "./apps/[app]/join/route";
import { GET as listKeys, POST as makeKey } from "./apps/[app]/muse-key/route";
import { POST as revokeKey } from "./apps/[app]/muse-key/revoke/route";
import { POST as answerQuestion } from "./owner-questions/[questionId]/answer/route";
import * as overviewRoute from "./muse/[app]/overview/route";
import * as statusRoute from "./muse/[app]/status/route";
import * as actionsRoute from "./muse/[app]/actions/route";
import * as cardsRoute from "./muse/[app]/cards/route";
import * as mcpRoute from "./muse/[app]/mcp/route";
import * as openapiRoute from "./muse/openapi.json/route";

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) as Promise<any> });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers });
const get = (path: string, headers: Record<string, string> = {}) => new Request(`http://localhost${path}`, { headers });
const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
const bearer = (key: string) => ({ authorization: `Bearer ${key}` });

const seen: string[] = [];
const keep = async (r: Response) => {
  seen.push(await r.clone().text());
  return r;
};

async function makeApp(id: string) {
  const cfg = { ...(await loadApp("garden-tools")), id, name: `Club ${id}`, tagline: "Neighbours swap seeds" };
  const c = await createApp(post("/api/apps", cfg), ctx());
  const creator = { cookie: cookieOf(c), ...((await c.json()) as any) };
  const m = await join(post(`/api/apps/${id}/join`, { name: "Bo" }), ctx({ app: id }));
  const member = { cookie: cookieOf(m), ...((await m.json()) as any) };
  return { creator, member };
}
async function keyFor(app: string, who: { cookie: string }) {
  const r = await makeKey(post(`/api/apps/${app}/muse-key`, { label: "My Muse" }, { cookie: who.cookie }), ctx({ app }));
  expect(r.status).toBe(200);
  return (await r.json()) as { keyId: string; key: string };
}
const read = (mod: { GET: (r: Request, c: any) => Promise<Response> }, app: string, key?: string, query = "", headers: Record<string, string> = {}) =>
  mod.GET(get(`/api/muse/${app}/x${query}`, { ...(key ? bearer(key) : {}), ...headers }), ctx({ app })).then(keep);

describe("read-only access for a person's own Muse (BR-44)", () => {
  afterEach(() => vi.useRealTimers());
  afterEach(endWorld);
  beforeEach(() => {
    seen.length = 0;
    resetWorld();
  });

  it("makes a key only for a signed-in person, shows it once, lists it without the key, and revokes it", async () => {
    const { member, creator } = await makeApp("club-k");
    // No session, no key.
    expect((await makeKey(post("/api/apps/club-k/muse-key", {}), ctx({ app: "club-k" }))).status).toBe(401);
    const { keyId, key } = await keyFor("club-k", member);
    expect(key).toMatch(/^agmk_[A-Za-z0-9_-]{43}$/);
    const list = await listKeys(get("/api/apps/club-k/muse-key", { cookie: member.cookie }), ctx({ app: "club-k" }));
    const text = await list.text();
    expect(JSON.parse(text).keys).toEqual([expect.objectContaining({ keyId, label: "My Muse", revoked: false })]);
    expect(text).not.toContain(key);
    // Another member cannot see or revoke it, and a Muse key cannot make or revoke keys (it is not a session).
    expect((await revokeKey(post("/api/apps/club-k/muse-key/revoke", { keyId }, { cookie: creator.cookie }), ctx({ app: "club-k" }))).status).toBe(404);
    expect((await makeKey(post("/api/apps/club-k/muse-key", {}, bearer(key)), ctx({ app: "club-k" }))).status).toBe(401);
    expect((await read(overviewRoute, "club-k", key)).status).toBe(200);
    const gone = await revokeKey(post("/api/apps/club-k/muse-key/revoke", { keyId }, { cookie: member.cookie }), ctx({ app: "club-k" }));
    expect(gone.status).toBe(200);
    expect((await read(overviewRoute, "club-k", key)).status).toBe(401);
    // Three active keys at most.
    for (let i = 0; i < 3; i++) await keyFor("club-k", member);
    expect((await makeKey(post("/api/apps/club-k/muse-key", {}, { cookie: member.cookie }), ctx({ app: "club-k" }))).status).toBe(409);
  });

  it("stores only a hash of the key", async () => {
    let saved = "";
    const store = createMuseKeyStore({ load: async () => null, save: async (j) => void (saved = j) });
    const { key } = await store.issue("a", "m");
    expect(saved).not.toContain(key);
    expect(saved).not.toContain(key.slice(5));
    expect(saved).toContain(sha256Hex(`agora.musekey.v1|${key}`));
    // It survives a restart.
    const again = createMuseKeyStore({ load: async () => saved, save: async () => undefined });
    expect(await again.authenticate(key)).toMatchObject({ appId: "a", memberId: "m" });
  });

  it("answers the four reads for the key's own member", async () => {
    const { member } = await makeApp("club-r");
    const { key } = await keyFor("club-r", member);
    const overview = await (await read(overviewRoute, "club-r", key)).json();
    expect(overview.app).toMatchObject({ id: "club-r", name: "Club club-r" });
    expect(overview.memberCount).toBe(2);
    expect(overview.notice).toMatch(/Read only/);
    const status = await (await read(statusRoute, "club-r", key)).json();
    expect(status.member).toMatchObject({ id: member.memberId, name: "Bo", role: "member" });
    expect(status.waiting).toEqual({ questions: [], confirmations: [], offers: [] });
    expect((await (await read(actionsRoute, "club-r", key, "?limit=5")).json()).actions).toEqual([]);
    const cards = await (await read(cardsRoute, "club-r", key)).json();
    expect(cards).toMatchObject({ count: 0, pending: { questions: [], confirmations: [], offers: [] } });
    expect((await read(actionsRoute, "club-r", key, "?limit=999")).status).toBe(400);
  });

  it("refuses a wrong key, a revoked key, a key of another app or member, a session cookie, and a key in the URL, all the same way", async () => {
    const a = await makeApp("club-a");
    const b = await makeApp("club-b");
    const ka = await keyFor("club-a", a.member);
    const kb = await keyFor("club-b", b.member);
    const bodies: string[] = [];
    for (const [app, key] of [["club-a", kb.key], ["club-b", ka.key], ["club-a", "agmk_" + "x".repeat(43)], ["club-a", "nonsense"], ["club-a", undefined]] as const) {
      const r = await read(statusRoute, app, key);
      expect(r.status).toBe(401);
      bodies.push(await r.text());
    }
    expect(new Set(bodies).size).toBe(1);
    // A signed-in session is not a Muse key, and the key is not accepted from the query string.
    expect((await read(statusRoute, "club-a", undefined, "", { cookie: a.member.cookie })).status).toBe(401);
    expect((await read(statusRoute, "club-a", undefined, `?key=${ka.key}`)).status).toBe(401);
    // Two members of one app each see only themselves.
    const second = await join(post("/api/apps/club-a/join", { name: "Cy" }), ctx({ app: "club-a" }));
    const cy = { cookie: cookieOf(second), ...((await second.json()) as any) };
    const kcy = await keyFor("club-a", cy);
    expect((await (await read(statusRoute, "club-a", kcy.key)).json()).member).toMatchObject({ id: cy.memberId, name: "Cy" });
    expect((await (await read(statusRoute, "club-a", ka.key)).json()).member).toMatchObject({ id: a.member.memberId, name: "Bo" });
    // A repository example app is not a stored app: no members and no keys to open it.
    expect((await read(statusRoute, "kids-gear", ka.key)).status).toBe(401);
  });

  it("has no write path: only GET reads exist, the connector description lists only GETs, and a key cannot answer a card", async () => {
    for (const mod of [overviewRoute, statusRoute, actionsRoute, cardsRoute, openapiRoute]) {
      expect(Object.keys(mod).filter((k) => ["POST", "PUT", "PATCH", "DELETE"].includes(k))).toEqual([]);
    }
    const spec = museOpenApi("https://example.test/agora");
    for (const [, methods] of Object.entries(spec.paths)) expect(Object.keys(methods)).toEqual(["get"]);
    // Trying to answer a card with a key (header, or the key as a cookie) is refused: the card routes need the person's own session.
    const { member } = await makeApp("club-w");
    const { key } = await keyFor("club-w", member);
    const tries = [
      post("/api/owner-questions/q1/answer?app=club-w", { as: "a", answer: "yes" }, bearer(key)),
      post("/api/owner-questions/q1/answer?app=club-w", { as: "a", answer: "yes" }, { cookie: `agora_s_club-w=${key}` }),
      post("/api/owner-questions/q1/answer?app=club-w", { as: "a", answer: "yes" }, { "x-api-key": key }),
    ];
    for (const req of tries) expect((await answerQuestion(req, ctx({ questionId: "q1" }))).status).toBe(401);
    // And the Muse door itself refuses writes.
    const w = await mcpRoute.GET(get("/api/muse/club-w/mcp", bearer(key)), ctx({ app: "club-w" }));
    expect(w.status).toBe(405);
  });

  it("serves the same four reads over MCP, read only, with no tool that answers a card", async () => {
    const { member } = await makeApp("club-m");
    const { key } = await keyFor("club-m", member);
    const rpc = async (body: unknown, k: string | null = key) =>
      keep(await mcpRoute.POST(post("/api/muse/club-m/mcp", body, { "content-type": "application/json", accept: "application/json, text/event-stream", ...(k ? bearer(k) : {}) }), ctx({ app: "club-m" })));
    const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init.status).toBe(200);
    const list = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
    const tools = list.result.tools as { name: string; annotations: { readOnlyHint: boolean } }[];
    expect(tools.map((t) => t.name).sort()).toEqual(["get_app_overview", "get_my_recent_actions", "get_my_status", "get_pending_cards"]);
    expect(tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
    const status = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_my_status", arguments: {} } })).json();
    expect(JSON.parse(status.result.content[0].text).member).toMatchObject({ id: member.memberId });
    const answer = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "answer_card", arguments: { id: "q1", answer: "yes" } } })).json();
    expect(answer.result?.isError ?? answer.error).toBeTruthy();
    // No key, wrong key, other app's key: 401.
    expect((await rpc({ jsonrpc: "2.0", id: 5, method: "tools/list" }, null)).status).toBe(401);
    expect((await rpc({ jsonrpc: "2.0", id: 6, method: "tools/list" }, "agmk_" + "y".repeat(43))).status).toBe(401);
    const other = await makeApp("club-n");
    const ko = await keyFor("club-n", other.member);
    expect((await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" }, ko.key)).status).toBe(401);
  });

  it("rate limits a key, and wrong keys", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z")); // the limits are lifted until the end of November 2026
    const { member } = await makeApp("club-l");
    const { key } = await keyFor("club-l", member);
    const codes: number[] = [];
    for (let i = 0; i < 61; i++) codes.push((await read(cardsRoute, "club-l", key)).status);
    expect(codes.slice(0, 60).every((c) => c === 200)).toBe(true);
    expect(codes[60]).toBe(429);
    // Wrong keys from one address run out of tries.
    resetMuseRateLimits();
    const wrong: number[] = [];
    for (let i = 0; i < 22; i++) wrong.push((await read(cardsRoute, "club-l", "agmk_" + String(i).padStart(43, "z"))).status);
    expect(wrong.slice(0, 20).every((c) => c === 401)).toBe(true);
    expect(wrong[21]).toBe(429);
  });

  it("never puts a key, a hash, a session or a recovery code in a response", async () => {
    const { member, creator } = await makeApp("club-s");
    const { key } = await keyFor("club-s", member);
    const token = member.cookie.split("=")[1]!;
    for (const mod of [overviewRoute, statusRoute, actionsRoute, cardsRoute]) await read(mod, "club-s", key);
    await read(statusRoute, "club-s", "agmk_bad");
    await listKeys(get("/api/apps/club-s/muse-key", { cookie: member.cookie }), ctx({ app: "club-s" })).then(keep);
    seen.push(JSON.stringify(museOpenApi("https://example.test/agora")));
    const all = seen.join("\n");
    for (const secret of [key, sha256Hex(`agora.musekey.v1|${key}`), token, sha256Hex(`agora.session.v1|${token}`), member.recoveryCode, creator.recoveryCode, creator.cookie.split("=")[1]!]) {
      expect(secret).toBeTruthy();
      expect(all).not.toContain(secret);
    }
    // The creator's member list stays the creator's: a member's overview carries a count, not names.
    expect(all).not.toContain("recoveryCode");
  });
});
