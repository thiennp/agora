import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { buildLimiter, createAppFor } from "@/app/_composition/interview";

export const dynamic = "force-dynamic";

/**
 * The yes (BR-40): store the draft as an app and make the caller its creator. The draft is checked by the app schema again, so a
 * hand-made body cannot relax an always-ask rule; an invalid one is answered 400 with the problems.
 */
export const POST = publicRoute({ schema: z.object({ draft: z.record(z.unknown()) }), limiter: buildLimiter }, async ({ input, req }) => createAppFor(input.draft, req));
