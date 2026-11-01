import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { authorize, getIdentityStore } from "@/app/_composition/identity";
import { assertHuman } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * The person approves the other computer with their own session, typing the four digits it shows. A person's own Muse key can never do
 * this (it is not a session), so a bot can pass the link along but only the person decides.
 */
export const POST = publicRoute({ schema: z.object({ code: z.string().min(1).max(128), verify: z.string().regex(/^\d{4}$/, "Type the four digits shown on the other computer.") }) }, async ({ input, params, req }) => {
  const appId = params.app!;
  const who = await authorize(req, appId);
  assertHuman(who);
  await getIdentityStore().approvePairing(appId, input.code, who.memberId, input.verify);
  return { ok: true };
});
