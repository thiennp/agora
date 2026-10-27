# Tools — business requirements

Folder: `tools/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Command-line entry points that are not part of the web app.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TOOL-01 | `npm run mcp:docs` serves the docs knowledge base as an MCP server on stdio, with logs on stderr only. | Should | The tool list and a cited answer are returned to an MCP client (`docs/DOCS-PLATFORM.md`). |
