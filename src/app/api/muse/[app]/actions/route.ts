import { z } from "zod";
import { museRoute } from "@/app/_composition/muse-api";

export const dynamic = "force-dynamic";

/** Read only, Muse key (BR-44): the member's recent actions, newest first. */
export const GET = museRoute(z.object({ limit: z.coerce.number().int().min(1).max(50).optional() }), (r, i) => r.actions(i.limit));
