import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { getAppStore } from "@/app/_composition/apps";
import { appSummary } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";

/**
 * Create an app from a config (BR-41): the body is the whole app config, validated by the app schema before it is stored, and the id
 * must be free. No code change and no redeploy. There is no sign-in yet (docs/PLAN.md §2c step 2), so anyone can create one; the
 * store caps how many there can be.
 */
export const POST = publicRoute({ schema: z.record(z.unknown()) }, async ({ input }) => {
  const app = await getAppStore().create(input);
  return { app: appSummary(app), path: `/app/${app.id}` };
});
