import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ as: personaKey, action: z.literal("approve") }),
  z.object({ as: personaKey, action: z.literal("place"), value: z.string().min(3).max(200) }),
  z.object({ as: personaKey, action: z.literal("drop"), value: z.string().min(1).max(100) }),
  z.object({ as: personaKey, action: z.literal("propose"), mode: z.enum(["pickup", "locker", "parcel_shop", "shipping"]) }),
  z.object({ as: personaKey, action: z.literal("address"), value: z.string().min(5).max(300) }),
  z.object({ as: personaKey, action: z.literal("fee"), senderPct: z.number().int().min(0).max(100), note: z.string().max(200).optional() }),
  z.object({ as: personaKey, action: z.literal("label") }),
  z.object({ as: personaKey, action: z.literal("track") }),
  z.object({ as: personaKey, action: z.literal("outcome"), ok: z.boolean(), reason: z.enum(["no_show", "item_mismatch", "changed_mind", "other"]).optional() }),
]);

/** Agree the way to hand over (or propose another), give the meeting place, drop point or delivery address, share postage, make the label, and record how it ended. */
export const POST = route({ schema }, async ({ platform, input, params }) => {
  const me = personaOf(platform, input.as).id;
  const id = params.dealId!;
  if (input.action === "approve") await platform.logistics.approve(id, me);
  else if (input.action === "place") await platform.logistics.setPickupPlace(id, me, input.value);
  else if (input.action === "drop") await platform.logistics.chooseDropPoint(id, me, input.value);
  else if (input.action === "propose") await platform.logistics.propose(id, me, input.mode);
  else if (input.action === "address") await platform.logistics.setShippingAddress(id, me, input.value);
  else if (input.action === "fee") await platform.logistics.setFeeSplit(id, me, { senderPct: input.senderPct, recipientPct: 100 - input.senderPct, note: input.note });
  // The drop-off window is the sender's own free hours: the demo has one window per persona.
  else if (input.action === "label") await platform.logistics.createLabel(id, me, personaOf(platform, input.as).availability[0]!);
  else if (input.action === "track") await platform.logistics.refreshTracking(id);
  else await platform.logistics.markOutcome(id, me, input.ok, input.reason);
  await platform.logistics.settled();
  await platform.learning.settled();
  return { ok: true };
});
