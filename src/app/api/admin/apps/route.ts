import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { listAdminApps, requireAdmin } from "@/app/_composition/admin";

export const dynamic = "force-dynamic";

/** Operator view of every app created on the platform: id, name, region, member count. Needs `Authorization: Bearer <ADMIN_TOKEN>` (or the admin cookie); 404 when no ADMIN_TOKEN is set. */
export const GET = publicRoute({ schema: z.object({}) }, async ({ req }) => {
  requireAdmin(req);
  return { apps: await listAdminApps() };
});
