import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { interviewLimiter, runInterview } from "@/app/_composition/interview";

export const dynamic = "force-dynamic";

const answer = z.object({ step: z.string().max(20), choice: z.string().max(20).optional(), text: z.string().max(400).optional() });

/**
 * The create-an-app interview (BR-40), stateless: the phone sends the answers so far, code checks them in order and answers with the
 * next question card, or, after the last answer, the checked draft and its plain-words summary for the one yes. Nothing is stored.
 */
export const POST = publicRoute({ schema: z.object({ answers: z.array(answer).max(12) }), limiter: interviewLimiter }, async ({ input }) =>
  runInterview(input.answers as Parameters<typeof runInterview>[0]),
);
