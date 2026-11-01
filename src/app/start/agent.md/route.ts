import { agentBrief } from "@/lib/interview";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";

export const dynamic = "force-static";

/** The brief for an assistant, as plain markdown for an assistant that fetches the link (also served for Accept: text/markdown or ?format=md). */
export const GET = () =>
  new Response(agentBrief(PUBLIC_BASE_URL), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
