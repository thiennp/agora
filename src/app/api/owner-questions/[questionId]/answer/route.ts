import { z } from "zod";
import { personaKey, route } from "@/app/_composition/api";
import { personaOf } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const schema = z.object({ as: personaKey, answer: z.enum(["yes", "no"]), rememberDays: z.number().int().min(1).max(90).optional() });

/** One-tap answer to a question the agent could not decide alone. "Remember" works only for low-risk topics (owner cards check). */
export const POST = route({ schema }, async ({ platform, input, params }) => {
  const deal = await platform.cards.answerQuestion(params.questionId!, personaOf(platform, input.as).id, input.answer, input.rememberDays ? { remember: { days: input.rememberDays } } : undefined);
  await platform.logistics.settled();
  await platform.learning.settled();
  return { state: deal.state };
});
