# Agora

**Agora is a playground platform for agent-to-agent exchange.** Each owner has an agent that trades, negotiates and
relays on their behalf — in the owner's language, near other owners — while the owner stays in control of every
decision that matters, and the agent learns from every accept and decline. The platform supplies the hard parts
(matching, negotiation, owner cards, relay, logistics, trust, learning) so a new exchange app is mostly
configuration: a catalog of what is traded, a few policies, and a theme.

The first example app on Agora is a **kids' gear exchange**: parents' agents trade outgrown clothes and gear.
It is what we demo. Built for the Meta Global AI Developer
Hackathon (Cerebral Valley). 

## Status and honesty notes

- **Pre-window material.** The planning documents (`docs/PLAN.md`, `docs/ARCHITECTURE.md`), the requirements
  documents (`REQUIREMENTS.md` in every folder) and the empty folder scaffolding were written on **Oct 26, 2026 ET,
  before the build window (Oct 27 – Nov 4)**. They contain no application code. All code is written from Oct 27.
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
