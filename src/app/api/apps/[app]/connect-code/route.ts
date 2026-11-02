import { z } from "zod";
import { publicRoute, Reply, HttpError } from "@/app/_composition/api";
import { appSummaryById } from "@/app/_composition/app-views";
import { authorize, getMuseKeyStore, isStoredApp } from "@/app/_composition/identity";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { connectPrompt } from "@/lib/app-config";
import { assertHuman, MuseKeyError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * "Connect my assistant": the signed-in person gets a one-time code and the text to paste into their own assistant. Needs the person's own
 * session (never a key). The code is the only secret in the prompt: it works once, ends in 15 minutes, and only swaps for a read-only key.
 */
export const POST = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const appId = params.app!;
  const app = await appSummaryById(appId);
  if (!app || !isStoredApp(appId)) throw new HttpError(404, "unknown_app", "This app has no members.");
  const who = await authorize(req, appId);
  assertHuman(who);
  try {
    const c = await getMuseKeyStore().issueConnectCode(appId, who.memberId);
    return new Reply({ code: c.code, expiresAt: c.expiresAt, prompt: connectPrompt(app, PUBLIC_BASE_URL, c.code) });
  } catch (e) {
    if (e instanceof MuseKeyError) throw new HttpError(409, e.code, e.message);
    throw e;
  }
});
