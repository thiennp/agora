import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getProjectStore } from "@/app/_composition/projects";
import { stepAnswersFromQuery, type Answer } from "@/lib/interview";

export const dynamic = "force-dynamic";

const answer = z.object({ step: z.string().max(20), choice: z.string().max(20).optional(), text: z.string().max(400).optional() });
const view = (p: { id: string; answers: unknown[] }) => ({ projectId: p.id, answered: p.answers.length });

/**
 * Record the answers of one interview under its project id (BR-48). `PUT {answers:[…]}` sets them (all so far, so a correction or
 * a step back replaces what was there); `GET ?purpose=…&actions=…` adds the given steps, for an assistant that can only open links.
 * Both read answers exactly like a tap or a draft link (same checks); neither builds anything.
 */
export const PUT = publicRoute({ schema: z.object({ answers: z.array(answer).max(12) }) }, async ({ input, params }) =>
  view(await getProjectStore().record(params.id!, input.answers as Answer[], "replace")),
);

export const GET = publicRoute({ schema: z.record(z.string().max(400)) }, async ({ input, params }) => {
  return view(await getProjectStore().record(params.id!, stepAnswersFromQuery(input), "merge"));
});
