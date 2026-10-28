import { handleMuseMcp } from "@/app/_composition/muse-api";

export const dynamic = "force-dynamic";

/** The same four reads as MCP tools (streamable HTTP, stateless, JSON replies), for a Muse that can add an MCP connector (BR-44, unconfirmed). */
const handle = async (req: Request, ctx: { params: Promise<{ app: string }> }) => handleMuseMcp(req, (await ctx.params).app);
export const POST = handle;
export const GET = handle; // answers 405: there is no event stream to open
