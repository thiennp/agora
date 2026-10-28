import { z } from "zod";
import { HttpError, personaKey, route } from "@/app/_composition/api";
import { indexedItem, personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.object({ as: personaKey, wantItemId: z.string().max(80), offerItemId: z.string().max(80) });

/**
 * The wanting owner asks their agent to open a deal on a match. The pair must be one the matcher itself returns for that want,
 * so nobody can start a deal on an arbitrary item. The agents then run until one of them needs an owner.
 */
export const POST = route({ schema }, async ({ platform, input }) => {
  const me = personaOf(platform, input.as);
  const want = await platform.catalog.items.get(input.wantItemId);
  if (!want) throw new HttpError(404, "not_found", "That item does not exist.");
  if (want.familyId !== me.id || want.kind !== "want") throw new HttpError(403, "not_owner", "Only the owner of a want can ask for a deal.");
  const found = platform.matcher.candidatesFor(indexedItem(platform, want));
  const match = found.matches.find((m) => m.offerItemId === input.offerItemId);
  if (!match) throw new HttpError(409, "wrong_state", "That offer is no longer a match for this want.");
  const offer = await platform.catalog.items.get(input.offerItemId);
  if (!offer) throw new HttpError(404, "not_found", "That item does not exist.");
  const deal = await platform.negotiation.start({ offerItemId: offer.id, wantItemId: want.id, offerFamilyId: offer.familyId, wantFamilyId: me.id });
  await platform.negotiation.run(deal.id);
  await platform.cards.settled();
  return { dealId: deal.id };
});
