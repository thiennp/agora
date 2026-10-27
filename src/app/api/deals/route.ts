import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { dealList } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

export const GET = route({ schema: z.object({ as: personaKey.default("a") }) }, async ({ platform, as }) => ({ deals: await dealList(platform, as) }));
