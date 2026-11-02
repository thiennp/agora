import { z } from "zod";
import { HttpError, publicRoute, Reply } from "@/app/_composition/api";
import { getWebhookStore } from "@/app/_composition/identity";
import { authorizeMuse, museIpLimiter } from "@/app/_composition/muse-api";
import { memberUpdatesFor } from "@/app/_composition/member-status";
import { getPlatform } from "@/app/_composition/platform";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { webhookLookup } from "@/app/_composition/webhooks";
import { assertPublicWebhook, WebhookUrlError } from "@/lib/webhook-url";

export const dynamic = "force-dynamic";

/**
 * The one thing a Muse key may write (BR-44): where to send "something changed" for its own member. It cannot answer, confirm or change
 * anything; the request that gets sent carries counts and a poll address only. One webhook per member. The address must be public https
 * (`src/lib/webhook-url.ts`). Registering again replaces it; the signing secret is returned once, or is the one the assistant chose.
 */
const body = z.object({ url: z.string().min(1).max(500), secret: z.string().min(16).max(128).optional() });

const register = publicRoute({ schema: body, limiter: museIpLimiter }, async ({ input, params, req }) => {
  const who = await authorizeMuse(req, params.app!);
  try {
    await assertPublicWebhook(input.url, webhookLookup());
  } catch (e) {
    if (e instanceof WebhookUrlError) throw new HttpError(400, "invalid_webhook_url", e.message);
    throw e;
  }
  // Start from now: a new webhook announces what happens next, not the past.
  const u = await memberUpdatesFor(await getPlatform(who.appId), who.memberId);
  const { secret } = await getWebhookStore().set(who.appId, who.memberId, { url: new URL(input.url).toString(), secret: input.secret, cursor: u.cursor, waiting: u.waiting.total });
  return new Reply({
    registered: true,
    secret: input.secret ? undefined : secret,
    secretShownOnce: !input.secret,
    signature: "Each request has x-agora-timestamp and x-agora-signature: sha256=HMAC-SHA256(secret, `${timestamp}.${rawBody}`). Reject a wrong signature or a timestamp more than 5 minutes old. Answer 2xx.",
    pollUrl: `${PUBLIC_BASE_URL}/api/muse/${encodeURIComponent(who.appId)}/updates`,
    notice: "A webhook only tells you something changed. It is best effort: keep polling now and then.",
  });
});

export const POST = register;
export const PUT = register;

export const GET = publicRoute({ schema: z.object({}), limiter: museIpLimiter }, async ({ params, req }) => {
  const who = await authorizeMuse(req, params.app!);
  return new Reply({ webhook: (await getWebhookStore().get(who.appId, who.memberId)) ?? null });
});

export const DELETE = publicRoute({ schema: z.object({}), limiter: museIpLimiter }, async ({ params, req }) => {
  const who = await authorizeMuse(req, params.app!);
  await getWebhookStore().remove(who.appId, who.memberId);
  return new Reply({ removed: true });
});
