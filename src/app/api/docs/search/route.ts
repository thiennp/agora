import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

const schema = z.object({ q: z.string().trim().min(2).max(300), limit: z.coerce.number().int().min(1).max(20).default(6) });

/** Ranked passages for a query, each with the file and lines to cite. */
export const GET = publicRoute({ schema }, async ({ input }) => ({
  hits: getDocsKb().index().search(input.q, { limit: input.limit, maxPerDoc: 3 }).map((h) => ({
    path: h.chunk.path, heading: h.chunk.headings.join(" › "), startLine: h.chunk.startLine, endLine: h.chunk.endLine, score: Number(h.score.toFixed(2)), text: h.chunk.text,
  })),
}));
