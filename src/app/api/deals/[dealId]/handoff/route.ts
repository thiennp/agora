import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ as: personaKey, action: z.literal("approve") }),
  z.object({ as: personaKey, action: z.literal("place"), value: z.string().min(3).max(200) }),
  z.object({ as: personaKey, action: z.literal("drop"), value: z.string().min(1).max(100) }),
  z.object({ as: personaKey, action: z.literal("outcome"), ok: z.boolean(), reason: z.enum(["no_show", "item_mismatch", "changed_mind", "other"]).optional() }),
]);

/** Agree the way to hand over, give the meeting place or drop point, and record how it ended. */
export const POST = route({ schema }, async ({ platform, input, params }) => {
  const me = personaOf(platform, input.as).id;
  const id = params.dealId!;
  if (input.action === "approve") await platform.logistics.approve(id, me);
  else if (input.action === "place") await platform.logistics.setPickupPlace(id, me, input.value);
  else if (input.action === "drop") await platform.logistics.chooseDropPoint(id, me, input.value);
  else await platform.logistics.markOutcome(id, me, input.ok, input.reason);
  await platform.logistics.settled();
  await platform.learning.settled();
  return { ok: true };
});
