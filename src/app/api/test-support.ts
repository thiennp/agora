import { vi } from "vitest";
import { resetRateLimit } from "@/app/_composition/api";
import { getAppStore, useAppStore } from "@/app/_composition/apps";
import { getIdentityStore, sessionCookie, useIdentityStore, useMuseKeyStore } from "@/app/_composition/identity";
import { resetInterviewLimits, useInterviewModel } from "@/app/_composition/interview";
import { useAdapterForTests } from "@/app/_composition/meta";
import { resetMuseRateLimits } from "@/app/_composition/muse-api";
import { getPlatform, type Platform } from "@/app/_composition/platform";
import { createAppStore, createMemoryBackend, loadApp, repoAppIds } from "@/lib/app-config";
import { createIdentityStore, createMuseKeyStore } from "@/lib/identity";
import { createMockAdapter } from "@/lib/meta/adapters/mock";
import type { ModelRequest } from "@/lib/meta/types";
import { POST as addItem } from "./items/route";
import { POST as startDeal } from "./matches/start/route";

/**
 * Shared set-up for the route tests. There is no built-in demo app any more: a test makes a real stored app (POST /api/apps, the same
 * door the interview build uses) and two real members of it, each with their own session cookie. `a` is the creator, `b` joins.
 * Which member acts is decided by the cookie alone; the `as` field of a request body is ignored by the server.
 */

export const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const j = async (r: Response): Promise<any> => await r.json();
export const cookieOf = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;

export interface Member {
  cookie: string;
  id: string;
  name: string;
}

/** The translation stand-in the old mock mode had: `[simulated <lang>] <text>`. Every other model call answers nothing useful. */
export function simulatedTranslation(extra?: (req: ModelRequest) => string | undefined) {
  return createMockAdapter((req) => {
    const own = extra?.(req);
    if (own !== undefined) return own;
    const to = /into language "([a-z]{2})"/.exec(req.system)?.[1];
    if (to) return JSON.stringify({ translation: `[simulated ${to}] ${(JSON.parse(req.prompt) as { text?: string }).text ?? ""}`, confidence: 0.9 });
    return req.json ? "{}" : `[mock ${req.model}] ${req.prompt.slice(0, 80)}`;
  });
}

/** Fresh stores, limits and model stand-in. Call in beforeEach. */
export function resetWorld(adapter = simulatedTranslation()): void {
  resetRateLimit();
  resetInterviewLimits();
  resetMuseRateLimits();
  useInterviewModel(undefined);
  useIdentityStore(createIdentityStore());
  useMuseKeyStore(createMuseKeyStore());
  useAppStore(createAppStore(createMemoryBackend(), { reserved: repoAppIds() }));
  useAdapterForTests(adapter);
  (globalThis as unknown as { __agoraPlatforms?: Map<string, unknown> }).__agoraPlatforms?.clear();
}

/** Undo what resetWorld installed that outlives a test. */
export function endWorld(): void {
  useAdapterForTests(undefined);
  vi.useRealTimers();
}

/** Pin the clock after the end of November 2026, when the request and stored-app limits apply again. */
export function pinClockAfterLimitsLift(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
}

let counter = 0;

export interface TestApp {
  appId: string;
  a: Member;
  b: Member;
  platform: Platform;
  /** The platform the way a route hands it to a handler for this member: both persona keys are this member (use with the view builders). */
  scoped(who: Member): Platform;
  /** A POST as this member, to a route of this app. */
  post(who: Member, path: string, body: unknown): Request;
  get(who: Member, path: string): Request;
}

/**
 * Create an app (a copy of the kids-gear example config under a new id) through the same stores the routes use, and two members: `a` the creator, `b` who joins.
 * Both get the app's first language; pass `languages` to give a member another one (the relay then translates for them).
 */
export async function createTestApp(opts: { from?: string; languages?: { b?: string } } = {}): Promise<TestApp> {
  const appId = `test-app-${++counter}`;
  const config = { ...(await loadApp(opts.from ?? "kids-gear")), id: appId, name: `Test ${appId}` };
  // The same two steps as POST /api/apps and POST /api/apps/{app}/join: the app is stored (validated by the schema) and each person gets a membership and a session.
  const req = new Request("http://localhost/");
  const cookieFor = (token: string) => sessionCookie(req, appId, token).split(";")[0]!;
  await getAppStore().create(config);
  const creator = await getIdentityStore().join(appId, "creator");
  const a: Member = { cookie: cookieFor(creator.sessionToken), id: creator.memberId, name: "Mia" };
  const second = await getIdentityStore().join(appId, "member", "Jonas");
  const b: Member = { cookie: cookieFor(second.sessionToken), id: second.memberId, name: "Jonas" };
  const platform = await getPlatform(appId);
  if (opts.languages?.b) platform.byId.get(b.id)!.language = opts.languages.b;
  const withApp = (path: string) => `${path}${path.includes("?") ? "&" : "?"}app=${appId}`;
  return {
    appId, a, b, platform,
    scoped: (who) => ({ ...platform, personas: { a: platform.byId.get(who.id)!, b: platform.byId.get(who.id)! } }),
    post: (who, path, body) => new Request(`http://localhost${withApp(path)}`, { method: "POST", body: JSON.stringify({ as: "a", ...(body as object) }), headers: { cookie: who.cookie } }),
    get: (who, path) => new Request(`http://localhost${withApp(path)}`, { headers: { cookie: who.cookie } }),
  };
}

/**
 * The old seeded scenario, made through the routes: `a` offers a winter jacket, `b` needs one, `b` asks their agent to reach out and the
 * agents run until the offering owner has to answer. Returns the deal id.
 */
export async function startJacketDeal(t: TestApp): Promise<{ dealId: string; offerId: string; wantId: string }> {
  const offer = await j(await addItem(t.post(t.a, "/api/items", { kind: "offer", category: "clothing", size: "68", condition: "good", description: "Winter jacket" }), ctx()));
  const want = await j(await addItem(t.post(t.b, "/api/items", { kind: "want", category: "clothing", size: "68" }), ctx()));
  const started = await startDeal(t.post(t.b, "/api/matches/start", { wantItemId: want.id, offerItemId: offer.id }), ctx());
  if (started.status !== 200) throw new Error(`could not start the deal: ${started.status}`);
  return { dealId: (await j(started)).dealId, offerId: offer.id, wantId: want.id };
}
