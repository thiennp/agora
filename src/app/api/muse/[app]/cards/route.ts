import { z } from "zod";
import { museRoute } from "@/app/_composition/muse-api";

export const dynamic = "force-dynamic";

/** Read only, Muse key (BR-44). */
export const GET = museRoute(z.object({}), (r) => r.cards());
