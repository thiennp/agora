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
the app on Agora for you. (The flow is built and tested with test doubles for the model; it has not been tried with a real Muse.)

Example apps on the platform:
- [`apps/kids-gear`](apps/kids-gear) — parents' agents trade outgrown kids' gear. An example app used by the simulation and the docs; it is not seeded into the running app.
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
- **Simulated parts.** The simulation and the judge dashboard use a sandbox city of synthetic families; everything they
  produce is labelled simulated. No real carrier is connected: shipping labels come from a simulated carrier and are shown as
  "not connected yet".
- **Private backend.** AgentWitch is an optional, private background provider for family memory. This repository
  runs without it.
- **No health advice.** The platform handles gear and logistics only.

## Where to start

1. [docs/PRIMITIVES.md](docs/PRIMITIVES.md) — what the platform offers and what is built.
2. [REQUIREMENTS.md](REQUIREMENTS.md) — business requirements, from the top down; every folder refines them.
3. [docs/PLAN.md](docs/PLAN.md) — scope, gates, schedule, risks.
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Fractal Slice Architecture, data model, privacy, scale, testing.

## Run it

```bash
npm install
cp .env.example .env   # set META_API_KEY, FIELD_ENCRYPTION_SECRET, REPORT_EXPORT_SECRET
npm run dev            # http://localhost:3000
```

There is no demo or mock mode. The app needs a real Meta Model API key (`META_API_KEY`: translation, photo intake and the
interviewer use Muse Spark and SAM 3.1) and two secrets of at least 16 characters (`FIELD_ENCRYPTION_SECRET` encrypts
addresses, `REPORT_EXPORT_SECRET` signs report exports); without them it fails and names the missing variable. State survives
restarts with `DATABASE_URL` (Postgres) or `AGORA_STATE_FILE=./state.json`; with neither it is memory only.

The home page `/` shows a QR code and a copy-paste prompt for Muse or Meta AI; both lead to the assistant brief `/start/agent.md` (the assistant runs the interview in chat and builds the app after the person types yes), the create-an-app
interview (the code always points at `https://agentwitch.com/agora/start`, so scanning only works once that is deployed;
locally open `/start/agent.md` directly). Creating an app makes you its creator; the app then lives at `/app/{app}` with its own items,
cards and deals pages. Every platform API route needs `?app=<id>` and that app's session cookie. Photos are never kept, only a
small picture of each item you list. `npm run simulate` writes the benchmark that the judge dashboard charts; `npm test`,
`npm run lint`, `npm run typecheck` and `npm run db:check` (needs Docker) check the rest. Tests use test doubles for the model;
no test calls Meta.

## Muse-first walkthrough

A person scans the QR code on the home page (or pastes the prompt into Muse), answers a short interview on their phone and gets
an app: an overview with an invite QR, a join page for friends, and a status page per member showing what their agent works on.
A person's own Muse can read that status through a read-only connector (`docs/MUSE-CONNECTOR.md`); it can never answer a card.
`npm test` covers the whole flow with test doubles (`src/app/api/muse-first-flow.test.ts`). Not tried with a real Muse. The
script, the fallback and the list of what is not connected are in [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).

## Create an app (paste into Muse)

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
