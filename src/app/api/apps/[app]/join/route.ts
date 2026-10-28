import { z } from "zod";
import { HttpError, Reply, publicRoute } from "@/app/_composition/api";
import { appSummaryById } from "@/app/_composition/app-views";
import { LIGHT_IDENTITY_NOTICE, getIdentityStore, sessionCookie, sessionTokenOf } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";

/**
 * Scanning an invite opens the join page; this is the tap on "Join" (BR-45). It creates a membership and sets the session cookie on
 * this phone. A phone that already has a session for the app keeps it (no second membership). The recovery code is shown once.
 */
export const POST = publicRoute({ schema: z.object({ name: z.string().max(60).optional() }) }, async ({ input, params, req }) => {
  const appId = params.app!;
  if (!(await appSummaryById(appId))) throw new HttpError(404, "unknown_app", "There is no such app.");
  const ids = getIdentityStore();
  const existing = await ids.authenticate(appId, sessionTokenOf(req, appId));
  if (existing) return { memberId: existing.memberId, role: existing.role, alreadyMember: true };
  const me = await ids.join(appId, "member", input.name);
  return new Reply({ memberId: me.memberId, role: "member", recoveryCode: me.recoveryCode, notice: LIGHT_IDENTITY_NOTICE }, [sessionCookie(req, appId, me.sessionToken)]);
});
