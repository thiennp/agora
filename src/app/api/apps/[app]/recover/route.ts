import { z } from "zod";
import { Reply, publicRoute, recoveryLimiter } from "@/app/_composition/api";
import { LIGHT_IDENTITY_NOTICE, getIdentityStore, sessionCookie } from "@/app/_composition/identity";
import { IdentityError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * A new phone: the recovery code gets a new session and replaces the code, and every older session ends (a lost phone is cut off).
 * The code travels in the request body, never in a URL. Rate limited hard per address; the answer for a wrong code is the same
 * whether the app, the member or the code is what was wrong.
 */
export const POST = publicRoute({ schema: z.object({ code: z.string().min(1).max(64) }), limiter: recoveryLimiter }, async ({ input, params, req }) => {
  const appId = params.app!;
  const r = await getIdentityStore().recover(appId, input.code);
  if (!r) throw new IdentityError("invalid_recovery", "That recovery code does not match this app.");
  return new Reply({ memberId: r.memberId, role: r.role, recoveryCode: r.recoveryCode, notice: LIGHT_IDENTITY_NOTICE }, [sessionCookie(req, appId, r.sessionToken)]);
});
