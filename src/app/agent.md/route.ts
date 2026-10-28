import { agentIndex } from "@/lib/agent-index";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";

export const dynamic = "force-static";

/** One address for an assistant to start from: how to create an app, how to use one, the read-only API, the rules. */
export const GET = () =>
  new Response(agentIndex(PUBLIC_BASE_URL), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
