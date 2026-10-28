import { z } from "zod";
import { HttpError, publicRoute } from "@/app/_composition/api";
import { appSummaryById } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";

/** What the join page may show about an app: name, tagline, region, who it is for. Nothing about its members or data (BR-42). */
export const GET = publicRoute({ schema: z.object({}) }, async ({ params }) => {
  const app = await appSummaryById(params.app!);
  if (!app) throw new HttpError(404, "unknown_app", "There is no such app.");
  return { app };
});
