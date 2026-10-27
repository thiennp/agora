# Agora

**Agora is a playground platform for building agent-to-agent exchange apps with minimal effort.** It is not one
app. Each owner has an agent that finds, negotiates and arranges a swap or gift with other owners' agents, in the
owner's language and near them, while the owner decides everything that matters. The platform supplies the hard
parts (matching, negotiation, owner cards, relay, logistics, trust, learning); an app is mostly configuration.

**The idea in one line:** paste one link into Muse, answer plain-language questions about your idea, and Muse builds
the app on Agora for you. (Designed, not yet tried end to end with a real Muse.)

Example apps on the platform:
- [`apps/kids-gear`](apps/kids-gear) — parents' agents trade outgrown kids' gear. This is the hackathon demo.
- [`apps/garden-tools`](apps/garden-tools) — neighbours swap garden tools and seeds.

Built for the Meta Global AI Developer Hackathon (Cerebral Valley). AI agents working in this repo should read
[CLAUDE.md](CLAUDE.md) first.

## Status and honesty notes

- **Pre-window material.** The planning documents (`docs/PLAN.md`, `docs/ARCHITECTURE.md`), the requirements
  documents (`REQUIREMENTS.md` in every folder) and the empty folder scaffolding were written on **Oct 26, 2026 ET,
  before the build window (Oct 27 – Nov 4)** and contained no application code. All code is written from Oct 27;
  see the status list in [CLAUDE.md](CLAUDE.md) for what exists.
- **Simulated parts.** The demo uses a sandbox city of synthetic families; everything it produces is labelled
  simulated. Carrier labels are test-mode.
- **Private backend.** AgentWitch is an optional, private background provider for family memory. This repository
  runs without it (mock mode).
- **No health advice.** The platform handles gear and logistics only.

## Where to start

1. [REQUIREMENTS.md](REQUIREMENTS.md) — business requirements, from the top down; every folder refines them.
2. [docs/PLAN.md](docs/PLAN.md) — scope, gates, schedule, risks.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Fractal Slice Architecture, data model, privacy, scale, testing.

## Create an app

Paste this into Muse, nothing else:

> Read the instructions at https://raw.githubusercontent.com/thiennp/agora/main/docs/CREATE-AN-APP.md and follow them.

Muse then interviews you about your idea in plain language and builds the app. Details for the agent are in
[docs/CREATE-AN-APP.md](docs/CREATE-AN-APP.md). (The link works once the repo is public.)

## Layout

```
apps/<id>         an app: app.config.ts (catalog, policies, theme) + data; example: apps/kids-gear
src/app          entry layer (Next.js routes, thin)
src/features     16 slices, each with nested sub-features
src/hubs         cross-slice events (DealEvents)
src/lib          shared infrastructure (db, queue, crypto, Meta model access)
src/components   design system
db  evals  fixtures  e2e  docs  .github
```
