import { z } from "zod";
import { publicRoute, Reply, HttpError } from "@/app/_composition/api";
import { authorize, getMuseKeyStore, isStoredApp } from "@/app/_composition/identity";
import { assertHuman, MuseKeyError } from "@/lib/identity";

export const dynamic = "force-dynamic";

async function human(req: Request, app: string) {
  if (!isStoredApp(app)) throw new HttpError(404, "unknown_app", "This app has no members.");
  const who = await authorize(req, app);
  assertHuman(who);
  return who;
}

/** The member's own keys (ids, labels, dates; never a key). Needs the person's own session. */
export const GET = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const who = await human(req, params.app!);
  return new Reply({ keys: await getMuseKeyStore().list(who.appId, who.memberId) });
});

/** Make a key for the person's own Muse (BR-44). Shown once, in this answer only; only its hash is stored. Needs the person's own session. */
export const POST = publicRoute({ schema: z.object({ label: z.string().max(40).optional() }) }, async ({ input, params, req }) => {
  const who = await human(req, params.app!);
  try {
    const k = await getMuseKeyStore().issue(who.appId, who.memberId, input.label);
    return new Reply({ keyId: k.keyId, key: k.key, shownOnce: true, readOnly: true });
  } catch (e) {
    if (e instanceof MuseKeyError) throw new HttpError(409, e.code, e.message);
    throw e;
  }
});
