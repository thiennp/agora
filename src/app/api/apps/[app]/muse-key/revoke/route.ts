import { z } from "zod";
import { publicRoute, Reply, HttpError } from "@/app/_composition/api";
import { authorize, getMuseKeyStore, isStoredApp } from "@/app/_composition/identity";
import { assertHuman, MuseKeyError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/** Revoke one of the member's own keys at once. Needs the person's own session; another member's key id is "not found". */
export const POST = publicRoute({ schema: z.object({ keyId: z.string().min(1).max(40) }) }, async ({ input, params, req }) => {
  const app = params.app!;
  if (!isStoredApp(app)) throw new HttpError(404, "unknown_app", "This app has no members.");
  const who = await authorize(req, app);
  assertHuman(who);
  try {
    await getMuseKeyStore().revoke(who.appId, who.memberId, input.keyId);
  } catch (e) {
    if (e instanceof MuseKeyError) throw new HttpError(404, e.code, e.message);
    throw e;
  }
  return new Reply({ revoked: true });
});
