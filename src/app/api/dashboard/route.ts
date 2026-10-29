import { z } from "zod";
import { publicRoute } from "@/app/_composition/api";
import { loadDashboard } from "@/app/_composition/reports";

export const dynamic = "force-dynamic";

export const GET = publicRoute({ schema: z.object({ scenario: z.enum(["stable", "drift"]).default("stable") }) }, async ({ input }) => loadDashboard(input.scenario));
