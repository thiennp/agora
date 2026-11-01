import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { deviceLabel, getIdentityStore, isStoredApp } from "@/app/_composition/identity";
import { HttpError } from "@/app/_composition/api";
import { appUrl } from "@/app/_composition/public-url";

export const dynamic = "force-dynamic";

/**
 * A new computer asks to be signed in as a person who already uses this app. It gets a `code` (for the prompt, which is safe to
 * show), a `secret` (kept on this computer, needed to collect the session) and four digits to read out. Nothing is granted until a
 * signed-in device approves. A phone that has no membership cannot be paired: it should join instead.
 */
export const POST = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const appId = params.app!;
  if (!isStoredApp(appId)) throw new HttpError(404, "unknown_app", `There is no app "${appId.slice(0, 40)}".`);
  const r = await getIdentityStore().startPairing(appId, deviceLabel(req));
  return { ...r, approveUrl: `${appUrl(appId)}/pair/${r.code}` };
});
