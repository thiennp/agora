import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.object({
  as: personaKey,
  dealId: z.string().min(1).max(100),
  reason: z.enum(["scam", "contact_harvesting", "off_platform_payment", "abusive", "no_show", "other"]),
  note: z.string().max(500).optional(),
});

/** Report a deal in two taps: it stops, held items are freed, and a hash-chained evidence bundle is kept. The reporter's identity stays hidden. */
export const POST = route({ schema }, async ({ platform, input }) => {
  const r = await platform.relay.reportDeal(input.dealId, personaOf(platform, input.as).id, input.reason, input.note);
  return { reportId: r.id, evidenceEntries: r.bundle.count };
});
