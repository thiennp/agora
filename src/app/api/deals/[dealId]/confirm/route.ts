import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.object({
  as: personaKey,
  cardId: z.string().min(1).max(100),
  decision: z.enum(["confirm", "decline"]),
  reason: z.object({ code: z.enum(["too_far", "wrong_size", "condition", "price", "timing", "other"]), text: z.string().max(280).optional() }).optional(),
});

/** An owner confirms or declines on their card; the deal is confirmed only when both have (negotiation checks). */
export const POST = route({ schema }, async ({ platform, input }) => {
  const deal = await platform.cards.decide(input.cardId, personaOf(platform, input.as).id, input.decision, input.reason);
  await platform.logistics.settled();
  await platform.learning.settled();
  return { state: deal.state };
});
