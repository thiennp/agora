import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { listAdminProjects, requireAdmin } from "@/app/_composition/admin";

export const dynamic = "force-dynamic";

/** Operator view of every app-creation interview, started or built (BR-48): project id, source, how many answers, the answers, when it last moved. Same token as /api/admin/apps. */
export const GET = publicRoute({ schema: z.object({}) }, async ({ req }) => {
  requireAdmin(req);
  return { projects: await listAdminProjects() };
});
