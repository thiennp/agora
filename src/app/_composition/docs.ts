import { createDocsKb, type DocsKb } from "@/lib/docs-kb";

const g = globalThis as unknown as { __agoraDocsKb?: DocsKb };

/** The docs knowledge base over this repository's markdown, shared by the API routes and pages (docs/DOCS-PLATFORM.md). */
export function getDocsKb(): DocsKb {
  return (g.__agoraDocsKb ??= createDocsKb(process.cwd()));
}
