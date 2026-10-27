import { z } from "zod";
import { route } from "@/app/_composition/api";
import { loadDashboard } from "@/app/_composition/reports";

export const dynamic = "force-dynamic";

export const GET = route({ schema: z.object({ scenario: z.enum(["stable", "drift"]).default("stable") }) }, async ({ input }) => loadDashboard(input.scenario));
