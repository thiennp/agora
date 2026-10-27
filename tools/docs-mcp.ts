import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDocsKb } from "@/lib/docs-kb";
import { createDocsMcpServer } from "@/lib/docs-kb/mcp";

/**
 * `npm run mcp:docs` starts the docs knowledge base as an MCP server on stdio (docs/DOCS-PLATFORM.md).
 * Logs go to stderr only: stdout belongs to the protocol.
 */
async function main() {
  const root = process.env.DOCS_ROOT ?? process.cwd();
  const kb = createDocsKb(root);
  await createDocsMcpServer(kb).connect(new StdioServerTransport());
  console.error(`agora-docs MCP server ready: ${kb.outline().length} docs from ${root}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
