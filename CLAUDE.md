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

**Agora is a real app, not a demo.** There is no demo or mock mode, no built-in personas and no seeded demo app. Every
platform API route needs `?app=<id>` of an app someone created (a stored app) plus that app's session cookie; an unknown
app or a missing session is refused. Translation, photo intake and the interviewer all call the real Meta Model API
(Muse Spark `muse-spark-1.3`, SAM 3.1) through `metaClientFor` in `src/app/_composition/meta.ts`. The app fails by name at
start if `META_API_KEY`, `FIELD_ENCRYPTION_SECRET` or `REPORT_EXPORT_SECRET` is missing (`requireRuntimeEnv` in
`src/lib/env.ts`; secrets at least 16 characters). Removed Oct 29: `AGORA_MODE`, `AGORA_INTAKE`, the Mia and Jonas
personas and the persona switch, the `/demo` page, the `(owner)` pages (`/items`, `/cards`, `/deals` with `?as=`), the
reset route, the demo scenario seed, the simulated translation adapter and the 501 `auth_not_built` path.

How a person meets it: the home page shows a copy-paste prompt for Muse or Meta AI (no QR code: assistants do not know what to do with one) that leads to the assistant brief `/start/agent.md` (there is no human `/start` page: the assistant runs the interview in chat)
(address hardcoded to `https://agentwitch.com/agora/start` in `src/app/_composition/public-url.ts`), which runs the
create-an-app interview (`src/lib/interview`, `/api/interview`, `/api/interview/build`: six scripted question cards about
the app only, the model offers examples and drafts wording, code sets all rules and validates against `schema.ts`, one yes
stores the app and makes the caller its creator). The assistant builds the app itself after the person types yes in chat, then gives them the public address, the admin address `/app/{app}/admin` (recovery-code door to the admin dashboard at `/app/{app}`, visible only to the creator) and the recovery code. An agent
index is at `/agent.md` and `/llms.txt`. The flow has not yet been tried with a real Muse (step 0, `docs/PLAN.md` §2d; Meta
documents custom connectors built from an API, MCP in the consumer app is unconfirmed).

Built, per app: `/app/{app}` public page (also markdown at `/app/{app}/agent.md`), the creator's private overview with the
share link, light identity (`src/lib/identity`: cookie session per app that slides 30 days from last use, recovery code, pairing a new computer by a copy-paste prompt with four digits and an approving tap, no sign-up form; real accounts are not
built), and usable pages `/app/{app}/items`, `/cards`, `/deals`, `/deals/{id}` in the app's own words (`appVocabulary`: a
free pick-up-only app is a board of posts and conversations). Every member of a stored app is a real party of that app's
platform (`Platform.addMember`, ADR 0007). The member status page `/app/{app}/muse/{id}` is visible only to that member.
Read-only access for a person's own Muse (BR-44, `docs/MUSE-CONNECTOR.md`): per-member keys, `GET /api/muse/{app}/…`,
OpenAPI and stateless MCP; no write method exists and a key cannot answer a card. Confirming is the person's own tap.
Operator list of all created apps: `/admin/apps` and `GET /api/admin/apps`, gated by the `ADMIN_TOKEN` env var (404 when unset; counts only, BR-39).
Interview projects (BR-48): a project id is opened when the interview starts (phone page, or an assistant via `/api/interview/projects`), each answer is recorded under it, and `/admin/apps` shows who is in progress, who built, and their answers. Reminder notifications are not built.
Each app has its own stores and saved state (Postgres `DATABASE_URL` or file `AGORA_STATE_FILE`, restored on start;
`docs/ARCHITECTURE.md` §11b; with neither it is memory only, development only).
Limits: request rate limits, the interview/build limits and the 200-stored-apps cap are lifted until 2026-12-01
(`limitsLifted` in `src/lib/rate-limit.ts`); the recovery-code and bad-key guards stay on.

Built platform slices: app config schema and loader, Meta client (routing, cost meter, budgets), family profile and
consent, catalog (items lifecycle, forecast), matching, gatekeeper (classifier, policy, red-team evals), negotiation (deal
state machine, offers, DealEvents hub), owner cards (questions, confirmations, standing rules, hard limits), language
(detection, real translation, per-owner views), relay (screened, translated, faithful), trust (screening, scam signals,
reputation, reports, `agora.report.v1` export), logistics (handoff modes, encrypted places and addresses, appointments,
tracking, outcomes; **no real carrier is connected**: labels come from a simulated carrier and are shown as "not connected
yet"), learning (lessons, tighten-only adjustments, standing-rule proposals), memory (local provider, AgentWitch mirror),
photo intake (upload, Muse Spark names the items, SAM 3.1 boxes, crops cut, original overwritten and never stored, owner
checks each draft; measured by `npm run evals:intake`, `docs/ARCHITECTURE.md` §11c), a docs Q&A platform
(`src/lib/docs-kb`, `/docs`, `/api/docs/*`, MCP server), a capacity model and matching benchmark (`docs/SCALE.md`), migrations
0001–0012 (`npm run db:check`, needs Docker), the public `/styleguide`, a judge dashboard (learning curves from the
simulation CSV, a synthetic-city map, live safety checks) and the **simulation** slice (sandbox city, simulated owners with
hidden rules, held-out benchmark; `docs/SIMULATION.md`), which is a test and evaluation tool, not a product mode. Two example
apps live in `apps/` (`kids-gear`, `garden-tools`); they feed the simulation and the docs and are not seeded into the running app.
Created apps still cannot: events, calendars, RSVPs, sign-up lists, group chat or announcements, a real carrier, or being
used through Muse alone.
Not built (their empty placeholder files were removed Oct 30; only the requirement documents remain): the `safety` and `voice` slices, the dashboard slice's sub-features, golden-file evals and Playwright e2e (the product journey is covered by `src/app/api/*.test.ts`, including `muse-first-flow.test.ts`).
Not built: durable relational storage (migrations 0001–0010 are unused; state is one saved document), a queue/outbox, real authentication, feature flags, a retention job, secret scanning (`docs/ARCHITECTURE.md` §12b), embedding search for docs Q&A, background removal on crops, a face detector, notifications, report review tooling, a real carrier, the real-model language quality test (G0), owner-card screens for stretch cards, Postgres-backed memory, voice.
Context: the hackathon demo (Oct 28 decision) is a real Muse creating an app live from a pasted prompt; the script is `docs/DEMO-SCRIPT.md`.
Also built (Oct 29): home page redesigned, Agora logo (`src/components/ui/Logo.tsx`; favicon, Apple icon and share image generated at build time), shared page header, new not-found and error screens.

## Working here

- Env (`.env.example`): optional `ADMIN_TOKEN` (opens `/admin/apps`), `META_API_KEY`, `FIELD_ENCRYPTION_SECRET`, `REPORT_EXPORT_SECRET` (required; at least 16 characters for the secrets), `DATABASE_URL` or `AGORA_STATE_FILE` (state), `APP` only for the simulation and the dashboard city map.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run dev`, `npm run db:check`, `npm run evals`, `npm run evals:intake` (needs a Meta key; makes 24 photos, about $0.60 in Muse Spark calls), `npm run bench:matching` (lookup latency at N items), `npm run capacity` (the tables in `docs/SCALE.md`), `npm run mcp:docs`, `npm run simulate` (the benchmark; writes `reports/simulation/<scenario>`, which the dashboard reads; the dashboard also runs it on first open). `APP=<id>` picks the app (default `kids-gear`).
- In a git worktree under `.claude/worktrees/`, vitest can fail on the parent checkout's empty `package.json`; run the
  tests from a copy of the repo outside the worktree if so.
