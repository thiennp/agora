import { z } from "zod";
import { publicRoute, Reply, HttpError } from "@/app/_composition/api";
import { appSummaryById } from "@/app/_composition/app-views";
import { getMuseKeyStore, isStoredApp } from "@/app/_composition/identity";
import { connectLimiter } from "@/app/_composition/muse-api";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { connectAbout, describeApp, loadApp } from "@/lib/app-config";
import { MuseKeyError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * The assistant swaps the person's one-time code for a read-only key (BR-44) and gets the app's minimal description, the addresses to poll
 * and the webhook address. No session needed: the code proves the person said yes. The answer repeats what the assistant must do next:
 * tell the person, in its own words, what it knows and what it would do.
 */
export const POST = publicRoute({ schema: z.object({ code: z.string().min(1).max(64), label: z.string().max(40).optional() }), limiter: connectLimiter }, async ({ input, params }) => {
  const appId = params.app!;
  const app = await appSummaryById(appId);
  if (!app || !isStoredApp(appId)) throw new HttpError(404, "unknown_app", "There is no such app.");
  try {
    const k = await getMuseKeyStore().redeemConnectCode(appId, input.code, input.label || "My assistant");
    const base = `${PUBLIC_BASE_URL}/api/muse/${encodeURIComponent(appId)}`;
    return new Reply({
      connected: true,
      key: k.key,
      keyShownOnce: true,
      readOnly: true,
      about: connectAbout(app, describeApp(await loadApp(appId))),
      urls: { app: `${PUBLIC_BASE_URL}/app/${appId}`, updates: `${base}/updates`, status: `${base}/status`, actions: `${base}/actions`, cards: `${base}/cards`, overview: `${base}/overview`, webhook: `${base}/webhook`, brief: `${PUBLIC_BASE_URL}/app/${appId}/connect.md` },
      next: "Now tell the person, in your own words and tone, what you know about this app (from `about`) and what you can do with it for them. Do not recite the lists, do not invent features, and say what you cannot do. Then start polling `urls.updates` (first call without `since`).",
      cannot: "You cannot answer, confirm, post or agree to anything. Those need the person's own tap in the app.",
    });
  } catch (e) {
    if (e instanceof MuseKeyError) throw new HttpError(e.code === "invalid_connect_code" ? 401 : 409, e.code, e.message);
    throw e;
  }
});
