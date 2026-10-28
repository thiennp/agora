import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { authorize, getIdentityStore } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";

/** The creator's view of who joined: names, roles and join times. Members get 403, strangers 401. Never a secret or another member's data. */
export const GET = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  await authorize(req, params.app!, "creator");
  return { members: await getIdentityStore().members(params.app!) };
});
