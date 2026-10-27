import { z } from "zod";
import { resetPlatform } from "@/app/_composition/platform";
import { route } from "@/app/_composition/api";

export const dynamic = "force-dynamic";

/** Start the demo scenario again. */
export const POST = route({ schema: z.object({}) }, async () => {
  const p = await resetPlatform();
  return { ok: true, dealId: p.dealId };
});
