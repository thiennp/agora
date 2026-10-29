# Documentation map

Quickest way in: **ask**. Run `npm run dev` and open `/docs`, or let your AI assistant use the `agora-docs` MCP server
(`docs/DOCS-PLATFORM.md`). To read, start from your question below.

| I want to know… | Read |
|---|---|
| What Agora is and is not | `README.md`, then `CLAUDE.md` ("What this project is", "What it is NOT") |
| What building blocks the platform offers | `docs/PRIMITIVES.md` |
| What must be true (requirements, by id) | `REQUIREMENTS.md`, then the `REQUIREMENTS.md` in each folder |
| How the system is built | `docs/ARCHITECTURE.md` (section 2b: platform vs apps; section 3: slices) |
| **Why** a design decision was made | `docs/adr/` — 0001 slices, 0002 platform and apps, 0003 primitives, 0004 tier gate, 0005 agents propose and code decides, 0006 model client and metering |
| **How it scales to 100M or 1B members and many apps** | `docs/SCALE.md` |
| How to create an app | `docs/CREATE-AN-APP.md`, with a worked dry run in `docs/DRY-RUN-garden-tools.md` |
| What is measured about learning | `docs/SIMULATION.md` |
| Privacy, retention and erasure | `docs/PRIVACY.md` |
| Security status and controls | `docs/SECURITY.md`, `docs/ARCHITECTURE.md` section 12b |
| The wire format for reports | `docs/PROTOCOL.md` |
| The plan, scope tiers and deadlines | `docs/PLAN.md` |
| The Muse-first walkthrough and demo script | `docs/DEMO-SCRIPT.md` |
| Connect a person's own Muse (read only) | `docs/MUSE-CONNECTOR.md` |
| How to ask the docs (chat, MCP, API) | `docs/DOCS-PLATFORM.md` |

## Reading order for a new engineer

1. `README.md` and `CLAUDE.md` (10 minutes): the idea, the rules that never depend on the app, the status.
2. `docs/PRIMITIVES.md` and `docs/adr/0002`, `0005` (20 minutes): the platform model and the central safety idea.
3. `docs/ARCHITECTURE.md` sections 2b, 3, 5, 7a (30 minutes): slices, the deal state machine, the gatekeeper.
4. `docs/SCALE.md` (20 minutes): what changes as it grows.
5. Run `npm test`, `npm run simulate`, `npm run dev`.

## Conventions

- A change to a requirement, behaviour, config field or scope updates the docs **in the same commit** (`CLAUDE.md`).
- Status words mean the same everywhere: **Built** (in the code, file named), **Designed** (decided, not built), **Measured**
  (a command in this repository produced it), **Assumed** (an input you can change).
- Decisions go in `docs/adr/` as short records: context, decision, consequences.
