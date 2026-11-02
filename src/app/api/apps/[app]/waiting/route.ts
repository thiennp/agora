import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { authorize } from "@/app/_composition/identity";
import { getPlatform } from "@/app/_composition/platform";

export const dynamic = "force-dynamic";

/**
 * How many things wait for this phone's member in the app, for the live badge every page polls (BR-43). Counts only: the cards
 * themselves are on `/app/{app}/cards`. 401 without a valid session for this app; a Muse key cannot read it (it has its own reads).
 */
export const GET = publicRoute({ schema: z.object({}) }, async ({ params, req }) => {
  const who = await authorize(req, params.app!);
  const p = await getPlatform(params.app!);
  await p.cards.settled();
  const questions = p.cards.questionsFor(who.memberId).length;
  const confirmations = p.cards.confirmationsFor(who.memberId).length;
  return { questions, confirmations, total: questions + confirmations };
});
