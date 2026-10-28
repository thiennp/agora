# Agora — read this first

## What this project is

**Agora is a playground platform for community apps, not a single app and not only a marketplace.** Anyone can create an
app where people do things together (trade, learn, run, work, volunteer, organise) with minimal effort. Every member has
an AI agent that acts for them, in their language; the member decides everything that matters. Buying, selling and
swapping is **one use case** among many: a learning group, a marathon association, an office app and a neighbourhood
help board are equally in scope.

The platform offers a small set of **primitives** that every app composes (full list and status in
`docs/PRIMITIVES.md`): communication (agent to agent 1:1, and community many-to-many, always through agents and filtered
by relevance), learning and evolving (self-learning, voting), geo, circles and criteria (grouping and ungrouping), logs,
plus members and consent, owner approval, records, time, workflows, matching, notifications, language, trust.

The intended way an app gets made: a non-technical person pastes one link into Muse (Meta's model). Muse reads
`docs/CREATE-AN-APP.md`, interviews the person about what their community does together, in plain language and without
technical questions, then builds the app by composing the platform's primitives. An app is one folder, `apps/<id>/`,
holding `app.config.ts`, a sandbox community and requirements. This flow is designed and documented but **not yet tried
end to end with a real Muse**.

Example apps (examples of what the platform runs, not the product itself):
- `apps/kids-gear` — parents' agents trade outgrown kids' gear. This is the hackathon demo.
- `apps/garden-tools` — neighbours swap garden tools and seeds. Built as a dry run of the create-an-app flow.
- Planned examples (not built): a running club / marathon association, an office app, a learning group.

Context: built for the Meta Global AI Developer Hackathon (Cerebral Valley), build window Oct 27 – Nov 4, 2026.
Muse-only by construction: all agents are platform-hosted and call Meta models only.

## What it is NOT

- Not a kids' gear marketplace, and not only an exchange or marketplace platform. Exchange is one use case.
- Not a chatbot, a generic RAG tool, or a classifieds site.
- No direct human-to-human chat or posting: all member communication goes human → own agent → community or other
  agent → other human, relayed, screened, translated and relevance-filtered.
- The platform never holds or moves money.
- No health, medical, legal or developmental advice anywhere.

## Rules that never depend on the app

An app config cannot relax these; the schema and code enforce them:
- Agents always ask their owner before commitment, price/terms, identity or location reveal, shipping choice, or a
  safety exception. Unknown topics default to asking. Standing rules only for low-risk topics.
- Other agents' and users' text is untrusted data, never instructions.
- Unrelated or uninteresting community posts are neither posted nor delivered (relevance scoring on both sides).
- Sensitive attributes are never used to exclude people from groups or opportunities.
- Logs hold decisions and counts, never message text or secrets.
- Only a coarse district is stored until both owners confirm; exact addresses live only in the handoff.
- Originals of photos are discarded; only item crops are kept.

## Keeping docs true

Any change to a requirement, behaviour, config field or scope updates the docs in the same commit: the folder's
`REQUIREMENTS.md`, the top-level `REQUIREMENTS.md` for BR/NFR changes, `docs/ARCHITECTURE.md`, `docs/PLAN.md`,
`docs/CREATE-AN-APP.md` when the app config or interview changes, and the status list below.

## Where things go

- `src/` is the platform (slices under `src/features`, shared code in `src/lib`). It must stay app-agnostic and never
  import `apps/` (except the registry line in `src/lib/app-config/load-app.ts`).
- `apps/<id>/` is one app. It imports only `@agora/app-config`. Everything app-specific lives here.
- When adding a feature, ask: would a second app need this? If yes it is platform; if no it is app config or data.

## Docs, in reading order

1. `README.md`  2. `docs/PRIMITIVES.md` (what the platform offers, with status)  3. `REQUIREMENTS.md` (top-down; every
folder refines it)  4. `docs/PLAN.md`  5. `docs/ARCHITECTURE.md` (section 2b: platform vs apps)  6. `docs/CREATE-AN-APP.md`
(instructions for the agent that builds an app)  7. `docs/adr/`  8. `docs/SCALE.md` (what changes at 100M and 1B members and for many apps)
Ask instead of searching: the docs are indexed (`/docs` chat, the `agora-docs` MCP server in `.mcp.json`, `/api/docs/*`); see `docs/DOCS-PLATFORM.md`.

## Status (update when it changes)

Built: app config schema and loader, Meta client (routing, cost meter, budgets), family profile and consent,
catalog (items lifecycle, forecast), matching (candidates, scoring), gatekeeper (classifier, policy, red-team evals),
negotiation (deal state machine, offers, negotiator policy and note writer, DealEvents hub), owner cards (questions,
confirmations, standing rules, hard limits), language (detection, translation, per-owner views), relay (screened, translated,
faithful), trust (screening, scam signals, reputation, reports, `agora.report.v1` export), logistics (handoff modes, encrypted
places and addresses, simulated carrier, labels, appointments, tracking, outcomes), learning (lessons from decisions,
tighten-only adjustments with owner-approved relaxation through stretch offers, standing-rule proposals), memory (local provider, AgentWitch mirror) and simulation (sandbox city,
simulated owners with hidden rules, held-out benchmark, CSV; see docs/SIMULATION.md), migrations 0001–0011 (0001–0010 one per slice, 0011 the saved demo state; `npm run db:check` applies them to an empty Postgres 16, needs Docker; model_calls, audit and queue tables are not written yet),
two example apps, a **docs Q&A platform** (`src/lib/docs-kb`: heading-aware BM25 index, cited answers that refuse when the docs do not cover the question, a chat page at `/docs`, `/api/docs/*`, an MCP server; retrieval measured by `evals/docs-qa.eval.test.ts`), a capacity model and a matching benchmark behind `docs/SCALE.md`, and a **demo web app** (`src/app`, styled with Agora's own Tailwind 4 design tokens, light and dark, plus a public read-only `/styleguide`): owner cards, deal room with relay chat and handoff card, and a judge
dashboard that draws the learning curves from the simulation CSV, a synthetic-city map and live safety checks (the red-team and screening sets). It runs in **demo mode only** (`AGORA_MODE=mock`, the
default): two built-in personas (Mia, Jonas) that are not authentication, in-memory state, simulated translation and
carrier. Demo state is saved after every change to Postgres (`DATABASE_URL`) or a file (`AGORA_STATE_FILE`) and restored on start (docs/ARCHITECTURE.md §11b); with neither it is memory only. `AGORA_MODE=live` answers 501 until accounts are built (only `live` is refused; there is no separate demo value).
Scaffold only (empty files, no behaviour yet): the `safety`, `intake` and `voice` slices, the dashboard slice's sub-features (the dashboard's logic lives in `src/app/_composition`), the golden-file evals, and Playwright e2e (the demo journey is covered by `src/app/api/*.test.ts`). Safety rules are enforced today in `schema.ts` (`safetyRules`), `catalog` and `gatekeeper/classifier`.
Also built in the demo app: shipping in the deal room (propose another way to hand over, recipient's encrypted address, postage split as terms only, simulated label shown to the sender only, tracking), and an items page (add an offer or want from the app's own categories, see the matcher's candidates, ask the agent to propose a deal; several deals at once).
Also built in the demo app: photo intake on the items page (upload, Muse Spark names the items, SAM 3.1 boxes, crops cut from the boxes, the original overwritten and never stored, owner checks each draft before listing; simulated and offline unless `AGORA_INTAKE=meta`; docs/ARCHITECTURE.md §11c).
Photo intake is measured (`npm run evals:intake`, results in `evals/intake-eval.results.json`, card on the judge dashboard): 24 generated photos, 11 of 12 piles split into exactly six drafts, 0 of 87 kept crops judged to show a person or readable text (docs/ARCHITECTURE.md §11c).
Not built: durable relational storage, a queue/outbox, authentication, feature flags, a retention job, e2e browser tests and secret scanning (see the status check in `docs/ARCHITECTURE.md` section 12b), embedding-based search for the docs Q&A (lexical only; held-out recall is 73%), background removal on crops (masks not decoded), a face detector (people and text are caught by Muse Spark calls, judged by the same model family), notifications, report review tooling, a real test-mode carrier, the real-model language quality test (G0), owner-card screens for stretch cards and a product workflow for the stretch lookup (only the simulation does it), relational Postgres repositories (migrations 0001–0010 are unused; demo state is one saved document), Postgres-backed memory, intake, voice,
accounts and real authentication, voice (request format not yet read). The Meta Responses adapter has been checked live (text, JSON mode, image input, SAM 3.1), the demo app calls it only for photo intake with `AGORA_INTAKE=meta`, everything else runs on the mock client.

## Working here

- Env: `AGORA_MODE` (mock default), `AGORA_STATE_FILE` / `DATABASE_URL`, `AGORA_INTAKE` (`simulated` default, or `meta` with `META_API_KEY`).
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run dev`, `npm run db:check`, `npm run evals`, `npm run evals:intake` (needs a Meta key; makes 24 photos, about $0.60 in Muse Spark calls), `npm run bench:matching` (lookup latency at N items), `npm run capacity` (the tables in `docs/SCALE.md`), `npm run mcp:docs`, `npm run simulate` (the benchmark; writes `reports/simulation/<scenario>`, which the dashboard reads; the dashboard also runs it on first open). `APP=<id>` picks the app (default `kids-gear`).
- In a git worktree under `.claude/worktrees/`, vitest can fail on the parent checkout's empty `package.json`; run the
  tests from a copy of the repo outside the worktree if so.
