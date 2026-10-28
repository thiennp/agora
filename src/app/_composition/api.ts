import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { getPlatform, type Platform, type PersonaKey } from "./platform";

/** Stable error shape for every route (API-03): { error: { code, message } }. */
export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

const STATUS: Record<string, number> = {
  not_found: 404, not_owner: 403, not_a_party: 403, restricted: 403, not_host: 403, not_recipient: 403, not_allowed: 403,
  already_decided: 409, wrong_state: 409, closed: 409, duplicate_report: 409, already_confirmed: 409, rate_limited: 429,
};

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
export const resetRateLimit = () => limiter.reset();

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
): Promise<Response> {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = limiter.check(ip);
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
    return json(200, await run(parsed.data as z.infer<S>, (await ctx.params) ?? {}));
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
 * Wraps a route: demo mode only, rate limited, input validated, errors in one shape (APP-01, API-01..03). Every action takes the
 * persona it acts as; the slices then check that persona really is a party to the card, deal or conversation, so one owner cannot
 * touch the other's cards. There are no accounts yet, so personas are not authentication.
 */
export function route<S extends z.ZodTypeAny>(opts: { schema: S; params?: string[] }, run: (ctx: Ctx<z.infer<S>>) => Promise<unknown>) {
  return (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> =>
    serve(req, ctx, opts.schema, async (input, params) => {
      if (process.env.AGORA_MODE === "live") throw new HttpError(501, "auth_not_built", "The demo console is not available in live mode: there are no accounts yet.");
      const platform = await getPlatform();
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
export function publicRoute<S extends z.ZodTypeAny>(opts: { schema: S }, run: (ctx: { input: z.infer<S>; params: Record<string, string> }) => Promise<unknown>) {
  return (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> =>
    serve(req, ctx, opts.schema, (input, params) => run({ input, params }));
}
