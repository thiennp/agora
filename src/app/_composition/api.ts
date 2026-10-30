import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { loadApp } from "@/lib/app-config";
import { getAppStore } from "./apps";
import { assertHuman } from "@/lib/identity";
import { authorize, isStoredApp } from "./identity";
import { getPlatform, type Platform, type PersonaKey } from "./platform";

/** Stable error shape for every route (API-03): { error: { code, message } }. */
export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

/** A successful answer that also sets cookies (a session is granted). Never cached. */
export class Reply {
  constructor(readonly body: unknown, readonly cookies: string[] = []) {}
}

const STATUS: Record<string, number> = {
  not_found: 404, not_owner: 403, not_a_party: 403, restricted: 403, not_host: 403, not_recipient: 403, not_allowed: 403,
  unauthenticated: 401, invalid_recovery: 401, forbidden: 403, too_many_members: 409, already_decided: 409, wrong_state: 409, closed: 409, duplicate_report: 409, already_confirmed: 409, app_exists: 409, too_many_apps: 409, too_many_projects: 409, rate_limited: 429,
};

/** The platform of an app by id; an id no repository or stored app has is a 404, not a server error. */
export async function platformFor(appId?: string): Promise<Platform> {
  if (appId === undefined) throw new HttpError(400, "app_required", "Say which app this is about (?app=<id>).");
  getAppStore();
  try {
    await loadApp(appId);
  } catch {
    throw new HttpError(404, "unknown_app", `There is no app "${appId.slice(0, 40)}".`);
  }
  if (!isStoredApp(appId)) throw new HttpError(404, "unknown_app", `There is no app "${appId.slice(0, 40)}".`);
  return getPlatform(appId);
}

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000, liftable: true });
/** Guessing a recovery code is the one attack light identity invites, so it gets its own, much tighter limit (per address). */
export const recoveryLimiter = createRateLimiter({ limit: 8, windowMs: 15 * 60_000 });
export const resetRateLimit = () => {
  limiter.reset();
  recoveryLimiter.reset();
};

export const personaKey = z.enum(["a", "b"]);

export interface Ctx<I> {
  input: I;
  platform: Platform;
  params: Record<string, string>;
  as: PersonaKey;
}

const json = (status: number, body: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** Rate limit, parse and validate the request, run the handler, and answer errors in one shape. Shared by every route. */
async function serve<S extends z.ZodTypeAny>(
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
  schema: S,
  run: (input: z.infer<S>, params: Record<string, string>) => Promise<unknown>,
  limit = limiter,
): Promise<Response> {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = limit.check(ip);
    if (!rl.ok) throw new HttpError(429, "rate_limited", `Too many requests. Try again in ${rl.retryAfterSec} seconds.`);

    let raw: unknown = {};
    if (req.method === "GET") raw = Object.fromEntries(new URL(req.url).searchParams);
    else {
      const text = await req.text();
      if (text.trim()) {
        try {
          raw = JSON.parse(text);
        } catch {
          throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
        }
      }
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, "invalid_input", parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
    const out = await run(parsed.data as z.infer<S>, (await ctx.params) ?? {});
    if (out instanceof Reply) {
      const h = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
      for (const c of out.cookies) h.append("set-cookie", c);
      return new Response(JSON.stringify(out.body), { status: 200, headers: h });
    }
    return json(200, out);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: { code: e.code, message: e.message } }, e.status === 429 ? { "retry-after": "5" } : undefined);
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && code in STATUS) return json(STATUS[code]!, { error: { code, message: (e as Error).message } });
    if (typeof code === "string" && e instanceof Error && e.constructor.name !== "Error") return json(400, { error: { code, message: e.message } });
    console.error("route error", e instanceof Error ? e.name : typeof e);
    return json(500, { error: { code: "internal", message: "Something went wrong." } });
  }
}

/**
 * Wraps a route: rate limited, input validated, errors in one shape (APP-01, API-01..03). Every action takes the
 * member it acts as (always the signed-in person of that app); the slices then check that member really is a party to the card,
 * deal or conversation, so one owner cannot touch another's cards.
 */
export function route<S extends z.ZodTypeAny>(opts: { schema: S; params?: string[] }, run: (ctx: Ctx<z.infer<S>>) => Promise<unknown>) {
  return (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> =>
    serve(req, ctx, opts.schema, async (input, params) => {
      // Which app this request is about: the `app` path parameter, else `?app=` (BR-41).
      const appId = params.app ?? new URL(req.url).searchParams.get("app") ?? undefined;
      let platform = await platformFor(appId);
      // An app is a space its members see (BR-42, BR-45): no session for this app, no access.
      if (appId !== undefined) {
        const who = await authorize(req, appId);
        if (req.method !== "GET") assertHuman(who); // an external Muse reads; every write needs the person's own session (BR-07, BR-44)
        // The caller acts as themselves, whatever `as` says: both persona keys resolve to the member the session proves, so one member
        // cannot act for another by naming a different persona.
        const me = platform.byId.get(who.memberId);
        if (!me) throw new HttpError(403, "not_a_party", "You are not a member of this app.");
        platform = { ...platform, personas: { a: me, b: me } };
      }
      const as = ((input as { as?: PersonaKey }).as ?? "a") as PersonaKey;
      const result = await run({ input, platform, params, as });
      if (req.method !== "GET") await platform.persist();
      return result;
    });
}

/**
 * A route that reads public project documentation, so it needs neither the demo scenario nor demo mode. Same rate limit,
 * validation and error shape as `route`.
 */
export function publicRoute<S extends z.ZodTypeAny>(
  opts: { schema: S; limiter?: ReturnType<typeof createRateLimiter> },
  run: (ctx: { input: z.infer<S>; params: Record<string, string>; req: Request }) => Promise<unknown>,
) {
  return (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> =>
    serve(req, ctx, opts.schema, (input, params) => run({ input, params, req }), opts.limiter);
}
