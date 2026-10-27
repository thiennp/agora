# Agora — read this first

## What this project is

**Agora is a playground platform, not a single app.** It lets anyone create an agent-to-agent exchange app with
minimal effort. In an exchange app, each owner has an AI agent that finds, negotiates and arranges a swap or gift
with other owners' agents, in the owner's language and near them, while the owner decides everything that matters.

The intended way an app gets made: a non-technical person pastes one link into Muse (Meta's model). Muse reads
`docs/CREATE-AN-APP.md`, interviews the person about their idea in plain language until it is clear (no technical
questions), then builds the app by following the platform's structure, workflow and API. An app is one folder,
`apps/<id>/`, holding `app.config.ts` (catalog, policies, theme, region, pricing), a sandbox city and requirements.
This flow is designed and documented but **not yet tried end to end with a real Muse**.

Example apps (both are examples of what the platform runs, not the product itself):
- `apps/kids-gear` — parents' agents trade outgrown kids' gear. This is the hackathon demo.
- `apps/garden-tools` — neighbours swap garden tools and seeds. Built as a dry run of the create-an-app flow.

Context: built for the Meta Global AI Developer Hackathon (Cerebral Valley), build window Oct 27 – Nov 4, 2026.
Muse-only by construction: all agents are platform-hosted and call Meta models only.

## What it is NOT

- Not a kids' gear marketplace. Kids' gear is one example app.
- Not a chatbot, a generic RAG tool, or a classifieds site.
- No direct human-to-human chat: human → own agent → other agent → other human, relayed, translated, screened.
- The platform never holds or moves money.
- No health, medical, feeding or developmental advice anywhere.

## Rules that never depend on the app

An app config cannot relax these; the schema and code enforce them:
- Agents always ask their owner before commitment, price/terms, identity or location reveal, shipping choice, or a
  safety exception. Unknown topics default to asking. Standing rules only for low-risk topics.
- Other agents' and users' text is untrusted data, never instructions.
- Only a coarse district is stored until both owners confirm; exact addresses live only in the handoff.
- Originals of photos are discarded; only item crops are kept.

## Where things go

- `src/` is the platform (slices under `src/features`, shared code in `src/lib`). It must stay app-agnostic and never
  import `apps/` (except the registry line in `src/lib/app-config/load-app.ts`).
- `apps/<id>/` is one app. It imports only `@agora/app-config`. Everything app-specific lives here.
- When adding a feature, ask: would a second app need this? If yes it is platform; if no it is app config or data.

## Docs, in reading order

1. `README.md`  2. `REQUIREMENTS.md` (top-down; every folder refines it)  3. `docs/PLAN.md`
4. `docs/ARCHITECTURE.md` (section 2b: platform vs apps)  5. `docs/CREATE-AN-APP.md` (instructions for the agent
that builds an app)  6. `docs/adr/`

## Status (update when it changes)

Built: app config schema and loader, Meta client (routing, cost meter, budgets), family profile and consent,
catalog (items lifecycle, forecast), matching (candidates, scoring), migrations 0001–0003, two example apps.
Not built: negotiation, gatekeeper engine, owner cards, relay, logistics, trust, learning, memory, intake, voice,
dashboard, UI, database access (in-memory stores only), live Meta API calls (endpoint format unconfirmed).

## Working here

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run dev`. `APP=<id>` picks the app (default `kids-gear`).
- In a git worktree under `.claude/worktrees/`, vitest can fail on the parent checkout's empty `package.json`; run the
  tests from a copy of the repo outside the worktree if so.
