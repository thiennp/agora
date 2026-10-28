import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getDocsKb } from "@/app/_composition/docs";
import { ask } from "@/lib/docs-kb";

export const dynamic = "force-dynamic";

const schema = z.object({ question: z.string().trim().min(3).max(500), k: z.number().int().min(1).max(8).optional() });

/** Answer a question from the docs, with numbered citations; says so plainly when the docs do not cover it. */
export const POST = publicRoute({ schema }, async ({ input }) => ask(getDocsKb().index(), input.question, { k: input.k }));
