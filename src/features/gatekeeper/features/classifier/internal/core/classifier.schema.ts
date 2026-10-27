import { z } from "zod";

/** Shape a model must return when asked to propose a topic (GAT-CLS-01). Anything else is discarded by the caller. */
export const proposalSchema = z.object({ topic: z.string().min(1).max(60), confidence: z.number().min(0).max(1) }).strict();
