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
  /** A photo draft whose picture this item keeps (only its owner can claim it). */
  draftId: z.string().max(60).optional(),
});

/** Add an item and list it in one step: the owner presses "List it" and sees what the agent found. Forbidden items are refused by the catalog. */
export const POST = route({ schema }, async ({ platform, input }) => {
  const me = personaOf(platform, input.as);
  const { as: _as, draftId, ...rest } = input;
  const item = await platform.catalog.items.create(me.id, rest);
  await platform.catalog.items.list(item.id);
  const indexed = indexedItem(platform, item);
  platform.matcher.onListed(indexed);
  if (draftId) platform.intake.crops.claim(me.id, draftId, item.id);
  const label = item.description || platform.app.catalog.categories.find((c) => c.id === item.category)?.label || item.category;
  platform.record(me.id, "listed", `${item.kind === "offer" ? "Listed what you offer" : "Noted what you need"}: ${label}`);
  if (item.kind === "want") {
    const found = platform.matcher.candidatesFor(indexed).matches.length;
    platform.record(me.id, "found", found ? `Found ${found} ${found === 1 ? "fit" : "fits"} for ${label} and showed you why` : `No fit yet for ${label}; your agent keeps looking`);
  }
  return { id: item.id, flags: item.safetyFlags.map((f) => f.advice) };
});
