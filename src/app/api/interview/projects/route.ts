import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getProjectStore, projectOpenLimiter } from "@/app/_composition/projects";

export const dynamic = "force-dynamic";

const schema = z.object({ source: z.enum(["phone", "assistant"]).default("assistant") });

/**
 * Open a project id the moment someone starts creating an app (BR-48). POST for the phone page; GET too, for an assistant that can only
 * open links. The id is all it returns: add answers with `PUT` or `GET /api/interview/projects/{id}`.
 */
const open = publicRoute({ schema, limiter: projectOpenLimiter }, async ({ input }) => {
  const p = await getProjectStore().open(input.source);
  return { projectId: p.id };
});
export const POST = open;
export const GET = open;
