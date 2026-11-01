import { z } from "zod";
import { Reply, publicRoute } from "@/app/_composition/api";
import { getIdentityStore, sessionCookie } from "@/app/_composition/identity";
import { IdentityError } from "@/lib/identity";

export const dynamic = "force-dynamic";

/** The new computer asks whether it was approved. Pending until then; once approved it gets its session cookie, once. The secret travels in the body only. */
export const POST = publicRoute({ schema: z.object({ code: z.string().min(1).max(128), secret: z.string().min(1).max(128) }) }, async ({ input, params, req }) => {
  const appId = params.app!;
  const r = await getIdentityStore().claimPairing(appId, input.code, input.secret);
  if (!r) throw new IdentityError("invalid_pairing", "This sign-in request has ended. Start a new one.");
  if (r === "pending") return { status: "pending" };
  return new Reply({ status: "approved", memberId: r.memberId, role: r.role }, [sessionCookie(req, appId, r.sessionToken)]);
});
