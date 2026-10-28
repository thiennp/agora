import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { authorize } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";

/** Who this phone is in the app: the member id and role, from the session cookie. 401 without a valid session for this app. */
export const GET = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const p = await authorize(req, params.app!);
  return { memberId: p.memberId, role: p.role };
});
