import { appSummaryById } from "@/app/_composition/app-views";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { connectBrief, describeApp, loadApp } from "@/lib/app-config";

export const dynamic = "force-dynamic";

/** The page an assistant opens from the connect prompt, as markdown. Public: config only, no code, key or user. */
export async function GET(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  const app = await appSummaryById(id);
  if (!app) return new Response("There is no such app.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(connectBrief(app, describeApp(await loadApp(id)), PUBLIC_BASE_URL), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=60" } });
}
