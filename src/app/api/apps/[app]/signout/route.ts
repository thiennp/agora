import { z } from "zod";
import { Reply, publicRoute } from "@/app/_composition/api";
import { getIdentityStore, sessionCookie, sessionTokenOf } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";

/** Ends this phone's session and clears the cookie. The membership and the recovery code stay. */
export const POST = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const appId = params.app!;
  const token = sessionTokenOf(req, appId);
  if (token) await getIdentityStore().revoke(appId, token);
  return new Reply({ ok: true }, [sessionCookie(req, appId, null)]);
});
