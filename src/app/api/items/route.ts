import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { indexedItem, personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.object({
  as: personaKey,
  kind: z.enum(["offer", "want"]),
  category: z.string().max(40),
  size: z.string().max(20).optional(),
  condition: z.string().max(40).optional(),
  description: z.string().max(300).optional(),
  attributes: z.record(z.string().max(100)).optional(),
});

/** Add an item and list it in one step: the owner presses "List it" and sees what the agent found. Forbidden items are refused by the catalog. */
export const POST = route({ schema }, async ({ platform, input }) => {
  const me = personaOf(platform, input.as);
  const { as: _as, ...rest } = input;
  const item = await platform.catalog.items.create(me.id, rest);
  await platform.catalog.items.list(item.id);
  platform.matcher.onListed(indexedItem(platform, item));
  return { id: item.id, flags: item.safetyFlags.map((f) => f.advice) };
});
