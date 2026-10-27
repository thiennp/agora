import { z } from "zod";
import { HttpError, personaKey, route } from "@/app/_composition/api";
import { dealView } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

export const GET = route({ schema: z.object({ as: personaKey.default("a") }) }, async ({ platform, as, params }) => {
  const v = await dealView(platform, params.dealId!, as);
  if (!v) throw new HttpError(404, "not_found", "No such deal for this owner.");
  return v;
});
