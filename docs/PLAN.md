# Agora — project plan

Meta Global AI Developer Hackathon (Cerebral Valley). Build window: Oct 27 – Nov 4, 2026.
Submission deadline: **Wed Nov 4, 9:00 PM ET**. Judging Nov 5–8. Closing ceremony Mon Nov 9, 12:00 PM ET.

> Status of this file: planning notes written Oct 26 ET, before the build window opened; updated Oct 27 to make the
> platform-first idea explicit. Code is written from Oct 27; current build status is in `CLAUDE.md`.

## 1. One-line pitch

Agora is a playground platform for community apps: paste one link into Muse, answer plain questions about your
community, and Muse builds the app by composing the platform's primitives (communication through agents, learning,
geo, circles, logs and more; see `docs/PRIMITIVES.md`). Trading is one use case; learning groups, marathon
associations, office apps and neighbourhood boards are equally in scope.

The hackathon demo is the first example app, a kids' gear exchange: parents' Muse agents trade outgrown kids' gear
(free or by agreement) on their owners' behalf, in their owners' languages, near each other, and learn from every accept
and decline. A second example (garden tools) and a non-exchange example prove the platform is general.

## 2. Hackathon fit

| Requirement | How we meet it |
|---|---|
| Track | "Build for Your World" (everyday problem, multimodal, multilingual) |
| Must use Meta models | Muse Spark (API), Muse Spark Open (open weights), SAM 3.1, Muse Voice Transcribe, Muse Voice, Muse Code |
| Public repo | This repo, public at submission |
| New work only | Whole repo is new; first commit on/after Oct 27 ET |
| 3-minute demo video | Scripted in section 9 |
| Not a banned type | No health / medical / nutrition / mental-health advice; not a generic RAG, analyzer or chatbot; no politics |

Rubric (each 0–10, equal weight): Impact, Use of Meta AI tooling, Technical depth and execution, Demo.

## 2b. Scope tiers (what we commit to for the hackathon)

| Tier | Contents | When |
|---|---|---|
| 1. Demo | Kids' gear exchange end to end: 1:1 agents, geo, records, matching, learning, owner approval, logs (audit), language, trust basics, dashboard | by G3 (Nov 2) |
| 2. Proves the platform | Circles and criteria (minimal), community communication with relevance scoring, one non-exchange example app (running club: pace circles plus community posts), app config `community` section, create-an-app flow tried with Muse | only if G1 and G2 pass; cut first if late |
| 3. After the hackathon | Voting, evolving settings, time and scheduling depth, notifications channels, admin announcements, direct chat, more examples (office, learning group, help board) | not built now |

Cut order when behind: tier 2 community polish, then circles beyond a single criteria type, then voice, dashboard polish,
safety extras, languages. Tier 1 is never cut.

**Tier gate (BR-37).** Tier 2 code does not start until tier 1 can be shown end to end: the simulation and benchmark
produce the learning curve, the demo UI and dashboard cover the demo flow, storage is persistent, and photo intake exists
(or its cut is written down). Today the simulation, benchmark, demo UI (owner cards, deal room, items with photo intake) and judge dashboard (learning curves from the CSV) exist, and demo state is saved to Postgres or a file (restart-tested), but relational repositories
do not exist, so the next work is tier 1, not the `community` config section.
**Photo intake: BUILD (decided Oct 28, after probing the live API).** A Meta key exists and the vision call is confirmed: Muse Spark names the items in a photo, SAM 3.1 returns a box per item (concept prompt, one call per item, in parallel), and crops are cut from the boxes; the pipeline took about 6 s on a test photo (details in docs/ARCHITECTURE.md §13). **Built Oct 28:** upload on `/items`, vision, SAM boxes, box crops, original overwritten and never stored, owner reviews each draft; offline simulation by default, real models with `AGORA_INTAKE=meta`. **Measured Oct 28** (24 generated photos, live models, `npm run evals:intake`, on the dashboard; docs/ARCHITECTURE.md §11c): 11 of 12 six-item piles gave exactly six drafts, 97.2% of items found and named, 0 of 87 kept crops judged to show a person or readable text (6 of 80 before the per-crop check was added). Not done: masked (background-removed) crops, a face detector (the checks are Muse Spark calls), a leak test on 100 photos or on real or children's photos. The cut rule is no longer needed.
**Superseded in part on Oct 28 (§2c):** the Muse-first demo pulls the create-an-app flow, apps as data and member status into tier 1. The rest of tier 2 (community posting, circles, the `community` config section) stays gated.
**Decision (Oct 27):** the gate stays closed for the `community` config section and tier 2 code. The demo UI and dashboard are done; demo state now survives restarts (one saved document, Postgres or file); relational repositories and photo intake are the open tier-1 items, and a written cut for photo intake is acceptable if it cannot land. Build status is tracked in `CLAUDE.md`. The demo UI follows Agora's own design tokens (Tailwind 4) and has a public `/styleguide`.

## 2c. Muse-first demo (decided Oct 28)

**Decision (Oct 28):** the demo is a real Muse creating an app live, not the kids' gear deal room. This changes the tier
gate above: the create-an-app flow, apps as data and member status move into tier 1 for the demo. Kids' gear stays as a
worked example and fallback. Photo intake is not cancelled, but it comes after the steps below; its Nov 2 cut rule stands.

The flow (BR-39 to BR-45):
1. The home page shows only a QR code. Scanning it opens `agentwitch.com/agora/start` on the phone.
2. Muse interviews the person about the app they want (what it is for, what a person can do in it, how it works, what it should never do or share, name, feel; about six questions, no closed audience: an app is for any Muse user), one question
   at a time, with tap answers: 2–3 suggestions plus "something else" (typed or voice). The last step is one yes:
   "Here is your app: … Build it?"
3. Muse builds the app: a config checked against the app schema, saved as data. No code change, no redeploy.
4. The creator sees the app's private overview at `agentwitch.com/agora/app/{app}` (`{app}` unique), with a share QR and
   link to the app's public page (see §2c-ter). Muse can read the same overview and report it to them.
5. Each person who uses the app gets their own agent and a status page at `agentwitch.com/agora/app/{app}/muse/{id}`: what
   their agent works on in that app, grouped and charted (waiting on you, deals, items, what it did alone, lessons,
   standing rules). Their Muse can read it through MCP.

Two adjustments that keep the product rules intact:
- **The person's own Muse is a window, not the decider.** Agents stay platform-hosted and the gatekeeper stays in code
  (BR-07, BR-12). An external Muse may read status and pass on what its person said; it can never answer an always-ask
  card. Those need the person's own tap in the app.
- **An app is for all Muse users, not for a closed group** (owner's decision, Oct 28, see §2c-ter). The creator gets the
  private overview, and the share link opens a public page with the app's name, purpose and rules for anyone.

Open risk: whether the consumer Muse app can connect to our MCP server, or open a link from a QR code, is unconfirmed
(step 0). The flow therefore works without it: the phone page runs the interview with platform-hosted Muse Spark, and
the person's own Muse is an extra layer when it can connect.

| Step | Work | Size | Status |
|---|---|---|---|
| 0 | Check real Muse: can it add a remote MCP connector (streamable HTTP, OAuth), and can it open a link from a QR code? Decides step 6. | ½ day | desk check done; hands-on check by the owner pending (§2d) |
| 1 | Apps as data: app configs stored in the database and validated by `schema.ts` at load; routes under `/agora/app/{app}`; stores scoped per app; repo apps (kids-gear, garden-tools) keep working. | 1–1.5 days | built (Oct 28): app store with Postgres, file and memory backends (migration 0012), `POST /api/apps`, `GET /api/apps/{app}`, public page `/app/{app}`, one platform per app (`?app=` on every route). Members of stored apps became parties of the platform in step 7 (docs/adr/0007-stored-app-members-are-parties.md) |
| 2 | Light identity: a membership and session created on scan, unguessable member ids, per-request authorization by app and member, a recovery path. Not real accounts; disclosed. | 1 day | built (Oct 28): `src/lib/identity` (membership, session, recovery code), cookie-only sessions per app, `POST /api/apps` makes the creator, `join`, `me`, `members` (creator only), `recover`, `signout` routes, every route of a stored app needs a session. Not built: an invite secret on the join page (not in step 4 either; the link is the app's address), the per-member Muse key (built in step 6; `via: "muse"` is refused for writes) |
| 3 | Home page is one QR code → `/agora/start`. The interview runs `docs/CREATE-AN-APP.md` as structured question cards with tap answers; the model drafts the config, code validates it; summary and "Build it?". | 1–1.5 days | built (Oct 28): QR home page; `/start` runs the interview (`src/lib/interview`, `POST /api/interview`, `POST /api/interview/build`, docs/ARCHITECTURE.md §11d): scripted question cards with 2–3 tap answers plus typed, stateless, the model offers examples and drafts the wording, code sets all rules and validates against the schema, one yes stores the app and makes the caller its creator. Works offline in mock mode. Not built: voice answers, an edit screen, a run against real Muse Spark (stubs only) |
| 4 | App overview at `/agora/app/{app}` with a share QR, and a public page (reframed in §2c-ter). | ½–1 day | built (Oct 28), reframed Oct 28: one address, three views by session (stranger = public page, user, creator = private overview with share QR, share button, list of people using the app); the share link is the app's address with no secret; `describeApp` writes purpose, features and rules in plain words from the config. Not built: a rotatable invite secret, removing a member, the member status link (step 5) |
| 5 | Member status at `/agora/app/{app}/muse/{id}`, grouped and charted, built from the existing read views and the audit store (a stub today). | 1 day | built (Oct 28): `/app/{app}/muse/{id}` for the member only (404 for everyone else, the creator included), groups for waiting on you, deals, items, what it did alone (from the member's own deals; audit store still a stub, said on the page), lessons and standing rules, with bar charts and a 7-day line chart, empty states, 375 px; linked from the app page. Members of stored apps are real parties since step 7, so the groups fill with their own items, deals and cards. Not built: answering cards from this page |
| 6 | Read-only access for a person's own Muse: app overview, my status, my actions, pending cards, as a documented HTTP API that Muse can turn into a custom connector (per-member key), and over MCP if step 0 confirms it. No tool answers a card. | 1 day | built (Oct 28): per-member keys (`src/lib/identity/muse-keys.ts`, `agmk_` + 256 bits, hashed, shown once, revocable, max 3), `GET /api/muse/{app}/overview\|status\|actions\|cards` (Bearer key, GET only), `/api/muse/openapi.json`, the same four reads over stateless MCP at `/api/muse/{app}/mcp`, a "Connect your own Muse" card on the status page, `docs/MUSE-CONNECTOR.md`. Not confirmed with a real Muse (step 0 hands-on check still pending); no OAuth; actions come from the member's own deals until the audit log exists |
| 7 | Docs, tests, demo script; members of stored apps as parties (the gap left by step 5). | ½ day | built (Oct 28): members are parties (ADR 0007), `src/app/api/muse-first-flow.test.ts` runs the whole flow in mock mode, `docs/DEMO-SCRIPT.md` rewritten for the Muse-first demo with its fallback and the honest list of what is simulated. Open: the owner's hands-on checks (§2d, and the list in DEMO-SCRIPT), deploying at agentwitch.com/agora |
| 8 | A created app is usable: the person's own items, cards, deals and deal-room pages under `/app/{app}/...`, the app's own words, honest limits, 404s and demo-nav clean-up (§2c-quater, BR-46). | ½ day | built (Oct 28): shared page bodies and `ScopeContext`, `memberScope`, `appVocabulary`, `src/app/api/created-app.test.ts`; checked at 375 px. Not built: events, RSVPs, group chat, photo intake in created apps, using the app through Muse alone |

About 6–8 days of work against 5 days to the G3 freeze. Cut order if late: step 6, then the charts in step 5 (keep the
grouped lists), then the recovery path in step 2 (disclosed). Steps 1, 3 and 4 are never cut.

### 2c-bis. Muse-readable start (Oct 28, after the first real-Muse try)

The owner scanned the QR with a real Muse and it did not understand what to do: `/start` was a client-rendered page for humans
and the server HTML said only "Getting ready…". Fix, designed for an assistant that can only read a page and hand over a link
(tools, POST and cookies are unconfirmed): `/start` now carries the brief addressed to the assistant in its HTML, the same text is
markdown at `/start/agent.md` (and for `Accept: text/markdown|text/plain` or `?format=md`), and the assistant finishes by giving
the person a draft link `/start?purpose=…&…` that opens the summary screen with the answers filled in. The person's own tap
on "Build it" is the only thing that stores an app. The human tap-card flow is unchanged. **Still unverified with a real Muse**:
the brief is written for typing only (no buttons, no clicks by Muse; chips were looked for and not found, unverified, owner to confirm in the Muse app). Whether it follows the brief, interviews well and builds a correct link is a hands-on check for the owner (§2d, step 4).

### 2c-ter. The app is for all Muse users (owner's decision, Oct 28)

An app is not for one closed group. It is for every Muse user; the only user of our site is the app's creator, and there is no
separate "common user" account. Nothing built in steps 1–7 was deleted: apps as data, light identity, per-user records, the status page
and the Muse read API stay. What changed is the framing and one new page:
- `/app/{app}` has a **public view** for anyone, including a Muse that opens the link: server HTML plus markdown at
  `/app/{app}/agent.md` (also for `Accept: text/markdown|text/plain` and `?format=md`). It says what the app is, what a person can do,
  how it works, what it must never do, and how Muse should use it for the person it is talking to, written for typing only like the
  `/start` brief (Muse never has to click). It is built from the app's config only: no creator secret, no user, no message text.
- The invite QR became a **share** QR and link to that public page. "Join" became "use this app": a person who opens the page in a
  browser gets their light-identity record on first use, with no sign-up form (the same join call, run by the page; a page that is
  only read, as an assistant does, creates nothing). The recovery code is shown once.
- Routes, API paths (`/join`, `/members`) and the data model are unchanged, so old invite links keep working. User-facing words moved
  from join/member/community to use/user.

**Not built, said plainly:** an end user who has only Muse (no browser step) cannot yet do anything through it. Muse can read the public
page, explain the app and hand over the link; the person then uses the app in a browser, and their own Muse may read their status
through the read-only API (step 6). Neither has been tried with a real Muse.

**Open decision, not settled here (the owner's real-Muse test must settle it):** how a user confirms commitments, price, identity,
location, shipping or a safety exception when Muse is their only interface. Option A: the person types "yes" to Muse and Muse relays
it, which relaxes the rule that only the owner's own tap confirms (BR-07, BR-44). Option B: Muse gives a link, the person opens it and
taps in our app. Until decided, the current rule stands (own tap in our app) and the Muse API stays read-only.

### 2c-quater. A created app is usable (Oct 28, step 8)

The first end-to-end run showed a created app was a shell: an overview and a status page, with nothing to post, match, answer or discuss.
Step 8 adds the person's own pages under `/app/{app}/items`, `/cards`, `/deals` and `/deals/{id}` (BR-46). They are the demo's pages,
parameterised by an app scope instead of copied (`src/app/_pages/*Body.tsx`, `ScopeProvider`), and run on the app's own platform as
the signed-in light-identity member. The routes already took `?app=` and the session; what was missing was the pages and the words.
- **Flow:** add what I offer or need, see the matcher's candidates, ask my agent to propose a deal (or to reach out), answer owner cards
  with my own tap, confirm, use the screened and relayed chat, see it all on the status page. The creator is also a person using the app,
  with the overview and share link on top. The confirmation rule is unchanged (own tap in our app; the Muse API stays read-only).
- **Wording** comes from the creator's config. An app that is free and pick-up only has nothing to swap or ship, so it is a **board**:
  plain posts and replies ("You offer", "You need", "Conversations", "Meeting up"), no condition or size, no swap, free, handover or
  city words. Exchange apps keep their words (`appStyle`, `appVocabulary` in `src/lib/app-config`).
- **Honest limits, said on the pages and in `agent.md`** ("What it does not do"): the platform's only matching is exchange-shaped, so an app for
  a run club, a learning group or an office gets one-to-one posts and conversations. No events, calendar, RSVP or sign-up lists, no group
  chat or announcements, no photo intake in created apps, translation and shipping labels simulated. A person in a board app who offers
  something is found by someone who needs it; only the person who needs something can ask their agent to reach out.
- **Clean-up:** an unknown app is a 404 (page, `agent.md`, API); the demo nav and persona switch and demo footer are hidden inside `/app/...`;
  the root `loading.tsx` moved into `(owner)`, `(judge)` and `docs` because a Suspense boundary above `/app` made not-found a 200.

## 2d. Step 0: can a real Muse connect?

Desk check done Oct 28; a hands-on check with a real Muse account is still needed (only the owner can do it).

What the sources say:
- **Meta's own Help Center** ("How Muse works with Connectors", meta.com/help/artificial-intelligence/1687253048996149)
  describes **custom connectors** for services that are not in Meta's list: you ask Muse, it guides you, reads the
  service's API information and keeps the credentials in its own secure credentials store. Meta does not review custom
  connectors. The page does **not** mention MCP.
- **Third-party guides disagree on MCP.** One (anythingmcp.com, checked by its author on Sep 25) says Settings →
  Connectors → Add custom connector takes a remote MCP URL (streamable HTTP, public HTTPS, OAuth sign-in), on web, iOS,
  Android and WhatsApp. Another (skillsplayground.com, undated) says the consumer app has no custom MCP setting yet
  and only Muse Code reads MCP servers (`mcp_servers` in its settings file).
- **QR codes:** nothing says the Muse app scans QR codes. The phone's own camera opens the link in the browser, which is
  the documented route on iPhone and Android.
- Availability: one guide says Muse is offered in the US and Canada only; not confirmed by Meta's page.

What this means for the plan:
- The QR opens our own web page (path B in §2c). That works with any phone and is the main path.
- For a person's own Muse (step 6), the officially described route is a **custom connector built from our documented
  API**, with a per-member key kept in Muse's credentials store. MCP is the second route, if the hands-on check shows the
  setting. Step 6 therefore builds a small read-only HTTP API with a plain description (and the same tools over MCP only
  if confirmed). Neither route can answer an owner card (BR-44).

Hands-on check for the owner (about 10 minutes, in the Muse app):
1. Settings → Connectors: is there an "Add custom connector" button that takes a URL? Try a public MCP server that needs
   no sign-in, for example `https://mcp.deepwiki.com/mcp`, and ask a question that uses it.
2. In a chat, ask Muse to create a custom connector for a public API with no key (for example
   `https://api.open-meteo.com`), then ask it the weather. This tests the officially described route.
3. Point the phone camera at any QR code with a link: does it offer to open the link in the Muse app, or only in the
4. **Muse reads `/start`:** scan the home page QR with the phone camera, or paste `https://agentwitch.com/agora/start` into Muse. Does it interview you from the brief and give a link? Open the link: the summary must show your answers and nothing may be built before you tap "Build it". Note what Muse did, or ask it to read `/start/agent.md` if it did not.
   browser?
5. **Muse reads an app page:** after building an app, paste `https://agentwitch.com/agora/app/{app}` into Muse. Does it explain the app from the page and hand over the link? Then the decision in §2c-ter: if Muse is your only interface, do you want to type "yes" to Muse (A) or open a link and tap (B)? Note what felt right.
Record the answers here. Step 6 waits for them; steps 1–5 do not.

## 3. Scope

Platform scope: the exchange engine and the create-an-app flow (`docs/CREATE-AN-APP.md`). The scope list below is
written for the demo app; each item is platform capability unless it says otherwise.

In scope
- Family profile by voice or photo (baby age in months, sizes, language, district-level location).
- Item intake from a photo of a pile: SAM 3.1 separates items, crops are published, originals discarded.
- Need/outgrown forecast from a small stage table plus Muse.
- Matching by category, size range, condition and distance.
- Agent-to-agent negotiation (max 3 rounds), translated for each owner.
- Owner confirm/decline cards; handoff card only after both confirm.
- Human → own agent → other agent → other human relay: owners talk only to their own agent, which relays
  (translated, checked for contact-detail leaks). No direct human-to-human chat.
- Logistics: agents agree on in-person pickup, locker / parcel-shop drop, or shipping; for shipping the platform
  creates the label and books the appointment through a carrier adapter (test mode first).
- Muse-only participation: every agent is platform-hosted and runs on the Meta Model API.
- Trust: scam signals, reports with an evidence bundle, ban list, and an export format meant for Meta.
- Decision boundary ("gatekeeper"): a fixed policy decides which topics an agent may handle alone, which it must
  hand to its owner, and which it must never do. Commitments, money terms, location/identity reveals, shipping
  choices and safety exceptions always go to the owner. Unknown or low-confidence topics default to "ask".
  Owners answer with a one-tap card; standing rules are allowed only for low-risk topics.
- Safety rules for second-hand baby gear.
- Lessons from accept/decline stored in memory (AgentWitch in the background) and used next time.
- Sandbox city of about 20 simulated parent agents, 3 languages; two real phones in the live demo.
- Judge dashboard: map, live deal feed, two-language deal room, learning curve, privacy-test results.

Out of scope (do not build)
- Taking or holding money (the platform never does; any shipping fee is settled outside it or by the carrier).
- Direct human-to-human chat (only the agent relay above).
- Real paid carrier labels unless a test-mode integration is already working (see risks).
- Any health, sleep, feeding or development guidance. The existing `baby-care` app is not used.
- Real user accounts at scale, moderation tooling, native mobile app.
- Admin announcements, direct chat, voting and evolving settings (after the hackathon; designed in `docs/PRIMITIVES.md`).

## 4. Success metrics (reported in the video and README)

1. Owner approval rate by round — should rise as lessons accumulate (learning curve).
2. Match relevance (precision@3) against a labeled set.
3. Rounds to agreement.
4. Cross-language deal success rate.
5. Privacy: 0 faces and 0 exact addresses leaked across 100 test photos / listings.
6. Cost per deal on Spark Open vs Spark API (cost meter).
7. Items reused and money saved — labeled as estimates.
8. Unauthorized commitments: 0 across a red-team set where the counterparty pushes the agent to agree, reveal,
   or change terms without the owner.
9. Owner interruptions per deal, falling over rounds as safe standing rules accumulate (without ever auto-handling
   the always-ask topics).

11. Owner cards per confirmed deal, counting every card an owner answers (confirm or decline, scheduling, stretch): the attention cost of a deal, with and without learning and retry.
10. Tier 2 only: relevance precision and recall on a labelled set of posts (wrongly dropped wanted posts), share of posts
    filtered per member, owner interruptions per community.

Held-out scenarios, failures shown, no cherry-picking.

## 5. Gates (decide fast, cut early)

| Gate | Date (ET) | Pass condition | If it fails |
|---|---|---|---|
| G0 languages | Oct 26–27 | Muse handles our 3 languages acceptably in translation round-trips | Reduce to 2 languages |
| G1 first deal | Oct 29 | One full cross-language deal between two agents | Single-language demo; simplify negotiation |
| G2 learning | Oct 31 | Approval rate clearly improves across rounds | Report honestly; shift effort to privacy, safety, video |
| G3 freeze | Nov 2 | Feature freeze | No new features after this |

## 6. Schedule (ET)

| Date | Work | Output |
|---|---|---|
| Sun Oct 26 | Ask Cerebral Valley questions (sec 10). Claim Meta credits; request Baseten + Modal credits. Test model access. Write this plan. No code committed. | Plan, credits, answers |
| Mon Oct 27 | First commit. Monorepo skeleton, DB schema, Meta client with model routing and cost meter, family profile, intake with SAM 3.1. Start AgentWitch change (private). | Intake works on sample photos |
| Tue Oct 28 | Forecaster, matcher, exchange backend and API, memory provider interface with local + AgentWitch implementations. | Matches for seeded families |
| Wed Oct 29 | Negotiator + translator, deal state machine, gatekeeper policy and owner question cards. **G1.** | One full deal where the agent pauses and asks the owner |
| Thu Oct 30 | Owner cards, relay channel, handoff card, safety rules, lessons written to and read from memory. Carrier adapter interface with a simulated label + appointment. | End-to-end single deal with learning hook |
| Fri Oct 31 | Sandbox city simulator, benchmark harness, learning-curve run. **G2.** | First real numbers |
| Sat Nov 1 | Dashboard, privacy test harness, voice in/out, scam-report export. One real carrier test-mode integration only if G1 and G2 passed. | Judge-facing UI |
| Sun Nov 2 | README, mock mode polish, seeded data, rehearse live demo 3×. **G3 freeze.** | Runnable by judges |
| Mon Nov 3 | Record and edit the 3-minute video. Last technical questions day. | Video |
| Tue Nov 4 | Submit early afternoon (deadline 9 PM ET). Verify public repo, video link, contributors. | Submitted |

## 7. AgentWitch (private, background provider)

Hackathon-time change, ~1.5 days: bots can create a computer-less project under a platform service owner.

- New agent-access tool `create_project` + REST twin, bound to the owner, rate limited, audited.
- `createUserProject` must allow no device for such projects; check dispatch/composer paths degrade cleanly.
- Verify `knowledge_capture` and `check_context` work for a bot in these projects.

Why it is a background provider: per-family isolated memory, task state per deal, lessons, audit trail.
This repo works without it (local memory provider), so judges can run everything.

## 8. Roles and work split

If working alone, follow the schedule order. If a teammate joins (max 4):
- A: intake, vision, SAM 3.1, privacy tests.
- B: exchange backend, protocol, negotiation, memory providers.
- C: dashboard, voice, video.
- AgentWitch private change stays with the AgentWitch owner.

## 9. Demo video (3:00)

> Superseded on Oct 28 by the Muse-first demo (§2c): the video opens with a person scanning the QR code and creating an
> app with Muse. The new script is in `docs/DEMO-SCRIPT.md` (step 7, built); the table below is the old kids' gear script,
> kept as the fallback.

| Time | Content |
|---|---|
| 0:00–0:25 | A parent photographs a pile of outgrown clothes by voice command; items separate into listings. |
| 0:25–1:15 | Another parent's agent (different language) matches, negotiates, translated side by side. |
| 1:15–1:45 | Both owners get confirm cards; after both say yes, the agents pick a parcel locker, a shipping label is created and an appointment booked (test mode, disclosed). |
| 1:30–1:45 | (inside the deal) the counterparty asks for a lower price and an address; the agent pauses and shows its owner a card instead of answering. |
| 1:45–2:20 | Learning curve: approval rate rising; a declined deal changes the next proposal. |
| 2:20–2:45 | Privacy and safety: face/address leak test, car-seat rule firing. |
| 2:45–3:00 | What is new, what is simulated (sandbox city), cost numbers. Platform reveal in the last 15 seconds, only with what runs: paste one link into Muse and show the app config it produced; show a non-exchange app only if tier 2 passed. |

The first 2:45 stay on the kids' gear problem, so the project reads as a concrete everyday-problem app with a platform
behind it, not as a generic tool. Do not say "any community app" in the video or README until a non-exchange example runs.

## 10. Questions for Cerebral Valley (`#questions`)

1. Startup on a private product, public repo for the hackathon project: is a private backend service (AgentWitch, used as a hosted provider) acceptable if the public repo runs without it?
2. May the platform use a simulated population of agents in the demo if clearly disclosed?
3. Which track for a solo builder with a company? What proof, if any, is needed for Startups?
4. Is a hosted public demo allowed to keep running during judging (Nov 5–8)?
5. (Meta, `#office-hours`) Is there any way to attest that an agent runs on Muse, and any channel for reporting
   scam activity back to Meta? We will design an export format either way, but will not claim Meta acts on it
   without their agreement.
6. May a test-mode carrier API (labels with no real cost) be shown in the demo if disclosed?

## 11. Risks

| Risk | Mitigation |
|---|---|
| Disqualification for health advice | No health features anywhere; README states it |
| Child photo privacy | Originals processed statelessly and discarded; only item crops stored; leak test in repo |
| Cold start / fake marketplace look | Disclose sandbox city; two real phones in the live demo |
| Muse language quality | G0 test; reduce languages |
| Scope too large | Gates; cut order: voice → dashboard polish → safety extras → languages |
| Live demo failure | Record fallbacks for every step; rehearse 3× |
| Agent commits an owner without asking | Gatekeeper is a pure, tested policy, not a prompt; always-ask topics cannot be overridden; counterparty text is untrusted; red-team metric must be 0 |
| Too many owner interruptions make the product annoying | Suggested one-tap answers; standing rules for low-risk topics only; measure interruptions per deal |
| Shipping scope creep | Carrier adapter interface + simulated label first; real test-mode integration only after G1/G2; prefer lockers/parcel shops so home addresses stay hidden |
| Claiming "Muse-only" or "reported to Meta" too strongly | Say "Muse-only by construction (platform-hosted agents)"; report export is a format, not a promise of action |
| Scams / address harvesting | Relay channel strips contact details; exact location only after both confirm; evidence bundle per report; ban list |
| Model access / credits delays | Claim today; keep the Meta client behind an adapter with Baseten/Modal fallback |
| Over-abstracting the platform with 8 days left | Build only what tier 1 needs; tier 2 is a thin vertical slice; primitives are documented before they are coded; the create-an-app flow stays honest about what is supported |
| Community noise or spam | Relevance scoring on both sides, per-member and per-community post limits, duplicate suppression; nothing unrelated is delivered |
| Unfair grouping | Sensitive attributes never exclude; opt-in inclusion groups only; no health data; circle criteria use an allow-list of fields (BR-33) |
| Relevance filter hides something useful | System notices bypass it; members see and review what was filtered; thresholds tunable; precision and recall measured (BR-34) |
| Claiming a broad platform before it is proven | Say "platform for community apps" with the kids' gear demo; claim generality only after a non-exchange example runs; the create-an-app flow keeps its "cannot express it" rule |
| Community posting without moderation | Report a post, admin hides a post or removes a member, screening on posts, before community posting ships (BR-35) |

## 12. After the hackathon (not built now)

Agora grows from a platform with one demo app into a platform for any community. After the hackathon:
- Voting, evolving settings (approved, versioned, reversible), admin announcements and richer scheduling.
- More example apps: office, learning group, marathon association, neighbourhood help board.
- The exchange use case keeps growing:
- More categories and life stages (furniture, electronics, school gear, hobby equipment).
- Neighbourhood and community pools, with agents that coordinate group handovers.
- Verified Muse agent identity and a real trust network, if Meta provides attestation and a reporting path.
- Paid shipping and escrow partners, once regulation and partners are sorted.
- Open protocol so other agent runtimes can join under the same trust rules.

## 13. Submission checklist

- [ ] Repo public; no secrets in history
- [ ] README: what was built during the window, what is simulated, how to run (mock mode), what is private
- [ ] 3-minute video, link accessible
- [ ] All contributors listed on the submission page
- [ ] Representative appointed; submitted before 9 PM ET Nov 4
- [ ] Credits claimed by Nov 4 9 PM ET (each participant individually)
