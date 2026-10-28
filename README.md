# Agora

**Agora is a playground platform for community apps.** Anyone can create an app where people do things together
(trade, learn, run, work, volunteer, organise) with minimal effort. Every member has an agent that acts for them in their
language, while the member decides everything that matters. Exchanging things is one use case; a learning group, a
marathon association, an office app or a neighbourhood help board are equally in scope.

Agora offers primitives that every app composes: communication (agent to agent, and community, always through agents
and filtered by relevance), learning and evolving, geo, circles and criteria (grouping), logs, plus members, owner
approval, records, time, workflows, matching, notifications, language and trust. See
[docs/PRIMITIVES.md](docs/PRIMITIVES.md).

**The idea in one line:** paste one link into Muse, answer plain-language questions about your community, and Muse builds
the app on Agora for you. (Designed, not yet tried end to end with a real Muse.)

Example apps on the platform:
- [`apps/kids-gear`](apps/kids-gear) — parents' agents trade outgrown kids' gear. This is the hackathon demo.
- [`apps/garden-tools`](apps/garden-tools) — neighbours swap garden tools and seeds.
- Planned: running club, office app, learning group.

Built for the Meta Global AI Developer Hackathon (Cerebral Valley). AI agents working in this repo should read
[CLAUDE.md](CLAUDE.md) first.

## Status and honesty notes

- **Pre-window material.** The planning documents (`docs/PLAN.md`, `docs/ARCHITECTURE.md`), the requirements
  documents (`REQUIREMENTS.md` in every folder) and the empty folder scaffolding were written on **Oct 26, 2026 ET,
  before the build window (Oct 27 – Nov 4)** and contained no application code. All code is written from Oct 27;
  see the status list in [CLAUDE.md](CLAUDE.md) for what exists.
- **What is proven today.** Only the exchange use case (the kids' gear and garden tools apps) can be expressed and run. Community
  posting, circles and a non-exchange example are designed (`docs/PRIMITIVES.md`) but not built; the platform is not claimed to
  be general until a non-exchange example runs.
- **Simulated parts.** The demo uses a sandbox city of synthetic families; everything it produces is labelled
  simulated. Carrier labels are test-mode.
- **Private backend.** AgentWitch is an optional, private background provider for family memory. This repository
  runs without it (mock mode).
- **No health advice.** The platform handles gear and logistics only.

## Where to start

1. [docs/PRIMITIVES.md](docs/PRIMITIVES.md) — what the platform offers and what is built.
2. [REQUIREMENTS.md](REQUIREMENTS.md) — business requirements, from the top down; every folder refines them.
3. [docs/PLAN.md](docs/PLAN.md) — scope, gates, schedule, risks.
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Fractal Slice Architecture, data model, privacy, scale, testing.

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

## Licence

Agora is open source under the [MIT licence](LICENSE), free to use, copy and change. All code in this repository,
including the interface components and design tokens, was written for it; no UI kit or template is copied in. The
packages it depends on are all open source and free of charge; their licences are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md), including the few non-permissive ones that arrive as transitive
tooling.
