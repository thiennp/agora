import { z } from "zod";
import { route } from "@/app/_composition/api";
import { ensureReports, loadDashboard } from "@/app/_composition/reports";

export const dynamic = "force-dynamic";

/** Run the simulation again (a few seconds) and return the fresh results. Simulated data only. */
export const POST = route({ schema: z.object({ scenario: z.enum(["stable", "drift"]).default("stable") }) }, async ({ input }) => {
  await ensureReports(input.scenario, true);
  return loadDashboard(input.scenario);
});
