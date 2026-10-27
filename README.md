# Hand-Me-Down

Parents' Muse agents trade outgrown kids' gear, free or by agreement, on their owners' behalf — in each owner's
language, near each other — and learn from every accept and decline. Built for the Meta Global AI Developer
Hackathon (Cerebral Valley). This is a first step; the same agent-to-agent exchange can grow to other categories
and communities.

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

## Layout

```
src/app          entry layer (Next.js routes, thin)
src/features     16 slices, each with nested sub-features
src/hubs         cross-slice events (DealEvents)
src/lib          shared infrastructure (db, queue, crypto, Meta model access)
src/components   design system
db  evals  fixtures  e2e  docs  .github
```
