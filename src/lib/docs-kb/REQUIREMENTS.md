# Docs knowledge base — business requirements

Folder: `src/lib/docs-kb/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Shared infrastructure](../REQUIREMENTS.md)  ·  Guide: [docs/DOCS-PLATFORM.md](../../../docs/DOCS-PLATFORM.md)

## Purpose

Let a person or an AI assistant ask a question about the project and get the passage that answers it, with its file and lines,
instead of searching by hand.

## Who it serves

Engineers, reviewers and AI assistants; the chat page at `/docs`, the `/api/docs/*` routes and the MCP server all use it.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| DKB-01 | Index every non-empty markdown file in the repository, skipping dependencies and build output, and pick up edits without a restart. | Must | `docs-kb.test.ts` (indexes markdown only; picks up edits). |
| DKB-02 | Every passage carries its file, heading path and exact line range, and code blocks are never split. | Must | `docs-kb.test.ts` (chunkMarkdown). |
| DKB-03 | An answer cites the passages it came from, pointing at the lines that answer the question. | Must | `docs-kb.test.ts` (ask, focus). |
| DKB-04 | When the docs do not cover a question, say so and cite nothing, rather than guess. | Must | `evals/docs-qa.eval.test.ts` refusal rate 100%. |
| DKB-05 | A model may write the answer only if it cites real sources; otherwise the extracted passage is returned. Source text is passed as untrusted data. | Must | `docs-kb.test.ts` (ask with generate). |
| DKB-06 | Read only indexed files, so a path such as `../../etc/passwd` returns nothing. | Must | `docs-kb.test.ts` (serves only indexed paths); MCP and HTTP checks. |
| DKB-07 | Retrieval quality is measured on a tuned set and a held-out set, with thresholds that fail the build. | Must | `evals/docs-qa.eval.test.ts`, `evals/thresholds.json` (`docsQa`). |
| DKB-08 | Expose search, ask, read and list as read-only MCP tools. | Should | `docs-kb.test.ts` (MCP tools). |

## Out of scope

Embedding-based search (a hybrid ranker is the next step), access control, indexing non-markdown files, and calling a real model.
