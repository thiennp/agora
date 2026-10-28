import { appAgentBrief, describeApp, loadApp } from "@/lib/app-config";
import { appSummaryById } from "@/app/_composition/app-views";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";

export const dynamic = "force-dynamic";

/**
 * The public page of an app as plain markdown for an assistant (Muse) that opens the share link; also served for `Accept: text/markdown`
 * and `?format=md` on `/app/{app}`. Public by design: config only, no session, no creator secret, no user, no message text.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  const app = await appSummaryById(id);
  if (!app) return new Response("There is no such app.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const body = appAgentBrief(app, describeApp(await loadApp(id)), PUBLIC_BASE_URL);
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=60" } });
}
