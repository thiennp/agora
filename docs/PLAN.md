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
(or its cut is written down). Today the building blocks exist in memory but none of these four is done, so the next work is
tier 1, not the `community` config section. Build status is tracked in `CLAUDE.md`.

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
