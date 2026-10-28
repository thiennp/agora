import { z } from "zod";
import { HttpError, personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

/** Take an item off the list. Only its owner may, and not while it is part of a confirmed deal (the catalog refuses). */
export const POST = route({ schema: z.object({ as: personaKey }) }, async ({ platform, input, params }) => {
  const me = personaOf(platform, input.as);
  const item = await platform.catalog.items.get(params.itemId!);
  if (!item) throw new HttpError(404, "not_found", "That item does not exist.");
  if (item.familyId !== me.id) throw new HttpError(403, "not_owner", "That item is not yours.");
  await platform.catalog.items.withdraw(item.id);
  platform.matcher.onUnlisted(item.id);
  platform.intake.crops.removeItem(item.id);
  return { ok: true };
});
