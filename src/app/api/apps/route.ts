import { z } from "zod";
import { Reply, publicRoute } from "@/app/_composition/api";
import { getAppStore } from "@/app/_composition/apps";
import { appSummary } from "@/app/_composition/app-views";
import { LIGHT_IDENTITY_NOTICE, getIdentityStore, sessionCookie } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";

/**
 * Create an app from a config (BR-41): the body is the whole app config, validated by the app schema before it is stored, and the id
 * must be free. No code change and no redeploy. Whoever creates it becomes its creator (BR-45): the answer sets their session cookie
 * and returns the recovery code once. Anyone can still create an app (there are no accounts); the store caps how many there can be.
 */
export const POST = publicRoute({ schema: z.record(z.unknown()) }, async ({ input, req }) => {
  const app = await getAppStore().create(input);
  const me = await getIdentityStore().join(app.id, "creator");
  return new Reply(
    { app: appSummary(app), path: `/app/${app.id}`, memberId: me.memberId, role: "creator", recoveryCode: me.recoveryCode, notice: LIGHT_IDENTITY_NOTICE },
    [sessionCookie(req, app.id, me.sessionToken)],
  );
});
