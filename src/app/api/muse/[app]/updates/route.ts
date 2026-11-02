import { z } from "zod";
import { museRoute } from "@/app/_composition/muse-api";

export const dynamic = "force-dynamic";

/**
 * Read only, Muse key (BR-44): what is new for the member since a cursor, and how many cards wait. This is the polling address an
 * assistant calls every minute or so. The first call (no `since`) returns only the starting cursor.
 */
export const GET = museRoute(
  z.object({ since: z.string().max(40).optional(), limit: z.coerce.number().int().min(1).max(50).optional() }),
  (r, i) => r.updates(i.since, i.limit),
);
