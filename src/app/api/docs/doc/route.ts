import { z } from "zod";
import { HttpError, publicRoute } from "@/app/_composition/api";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

const schema = z.object({ path: z.string().min(1).max(300), section: z.string().max(200).optional() });

/** One indexed markdown file (or the passages under a heading). Only indexed paths resolve. */
export const GET = publicRoute({ schema }, async ({ input }) => {
  const doc = getDocsKb().get(input.path, input.section);
  if (!doc) throw new HttpError(404, "not_found", "No such document.");
  return doc;
});
