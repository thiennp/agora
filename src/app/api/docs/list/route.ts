import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

/** Every indexed document with its title and headings. */
export const GET = publicRoute({ schema: z.object({}) }, async () => ({ docs: getDocsKb().outline() }));
