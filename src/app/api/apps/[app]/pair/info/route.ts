import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { authorize, getIdentityStore } from "@/app/_composition/identity";
import { IdentityError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/** For the signed-in device: which computer is asking, before the person decides. Needs this app's session. */
export const POST = publicRoute({ schema: z.object({ code: z.string().min(1).max(128) }) }, async ({ input, params, req }) => {
  const appId = params.app!;
  await authorize(req, appId);
  const info = await getIdentityStore().pairingInfo(appId, input.code);
  if (!info) throw new IdentityError("invalid_pairing", "That sign-in request has ended. Ask the other computer for a new one.");
  return info;
});
