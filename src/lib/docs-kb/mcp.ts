import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ask, type Generate } from "./answer";
import type { DocsKb } from "./corpus";

/**
 * Model Context Protocol server over the docs knowledge base, so an AI assistant can look things up instead of the user
 * pasting files. Every tool is read-only and can reach only indexed markdown files. Replies are plain text with file and line
 * citations, which is what an assistant needs to quote its source.
 */
export function createDocsMcpServer(kb: DocsKb, opts: { generate?: Generate } = {}): McpServer {
  const server = new McpServer({ name: "agora-docs", version: "0.1.0" });
  const readOnly = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;
  const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

  server.registerTool(
    "search_docs",
    {
      title: "Search the docs",
      description:
        "Find passages in the project docs (architecture, requirements, ADRs, scale, security, simulation). Works best with specific terms: requirement ids like BR-38 or NEG-OFR-02, function names like decideTurn, or topic words. Returns file:line citations.",
      inputSchema: { query: z.string().min(2).max(300), limit: z.number().int().min(1).max(20).optional() },
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      const hits = kb.index().search(query, { limit: limit ?? 6, maxPerDoc: 3 });
      if (!hits.length) return text("No passages matched. Try other words, or call list_docs to see what exists.");
      return text(
        hits
          .map((h, i) => `${i + 1}. ${h.chunk.path}:${h.chunk.startLine}-${h.chunk.endLine}${h.chunk.headings.length ? ` › ${h.chunk.headings.join(" › ")}` : ""} (score ${h.score.toFixed(1)})\n${h.chunk.text.slice(0, 500)}`)
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "ask_docs",
    {
      title: "Ask a question about the project",
      description:
        "Answer a question from the docs with numbered citations. If the docs do not cover it the answer says so (grounded=false) instead of guessing. Prefer this for 'how does X work' and 'why was X decided'.",
      inputSchema: { question: z.string().min(3).max(500) },
      annotations: readOnly,
    },
    async ({ question }) => {
      const a = await ask(kb.index(), question, { generate: opts.generate });
      const sources = a.citations.map((c) => `[${c.n}] ${c.path}:${c.startLine}-${c.endLine}${c.heading ? ` › ${c.heading}` : ""}`).join("\n");
      const related = a.related.length ? `\nClosest topics: ${a.related.map((r) => r.path + (r.heading ? ` › ${r.heading}` : "")).join("; ")}` : "";
      return text(`${a.answer}\n\ngrounded=${a.grounded} mode=${a.mode}${a.note ? `\n${a.note}` : ""}${sources ? `\n\nSources:\n${sources}` : ""}${related}`);
    },
  );

  server.registerTool(
    "get_doc",
    {
      title: "Read a doc",
      description: "Read one markdown file in full, or only the passages under a heading (case-insensitive part of a heading). Use after search_docs to read in context.",
      inputSchema: { path: z.string().min(1).max(300), section: z.string().max(200).optional() },
      annotations: readOnly,
    },
    async ({ path, section }) => {
      const doc = kb.get(path, section);
      if (!doc) return { isError: true, content: [{ type: "text" as const, text: `No indexed doc "${path}"${section ? ` with a heading containing "${section}"` : ""}. Call list_docs for valid paths.` }] };
      return text(`# ${doc.title}\n(${doc.path})\n\n${doc.markdown}`);
    },
  );

  server.registerTool(
    "list_docs",
    {
      title: "List the docs",
      description: "Every indexed markdown file with its title and headings. Start here to see what exists.",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => text(kb.outline().map((d) => `${d.path} — ${d.title}${d.headings.length ? `\n  ${d.headings.slice(0, 12).join(" | ")}` : ""}`).join("\n")),
  );

  return server;
}
