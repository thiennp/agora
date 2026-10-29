# Agora — business requirements

Top-level requirements for the whole project. Every folder below contains its own `REQUIREMENTS.md` that refines
these for its capability. Requirement IDs are stable: `BR-nn` (business), `NFR-nn` (non-functional), and
`<PREFIX>-nn` inside a folder.

## 1. Vision

Agora is a **playground platform for community apps**: anyone can create an app where people do things together (trade,
learn, run, work, volunteer, organise) with minimal effort. A person pastes one link into Muse, answers plain-language
questions about their community (never technical ones), and Muse builds the app by composing the platform's primitives
(`docs/PRIMITIVES.md`). An app is configuration plus data; the platform supplies communication, learning, geo, grouping,
logs and the safety guarantees.

Every member has an agent that acts for them in their language, while the member stays in control of every decision that
matters. Buying, selling and swapping is one use case; a learning group, a marathon association, an office app and a
neighbourhood help board are equally in scope.

The hackathon demo (decided Oct 28) is a real Muse creating an app live: a person scans a QR code, answers Muse's
questions with taps, gets their app with a share QR, and every user sees what their agent is doing (BR-39 to BR-46,
docs/PLAN.md §2c).

The first example app is a **kids' gear exchange**: parents buy a lot of baby and kids gear that
is outgrown in months, and each parent's Muse agent trades it for free or by agreement with nearby parents. A second
example, garden tools, and planned examples (running club, office app, learning group) show the platform is general.

## 2. Users

| User | Needs |
|---|---|
| App creator (often non-technical) | Turn an idea for their community into a working app by answering plain questions, without learning the platform or breaking its safety rules. |
| Community admin | Shape the community's purpose, topics, circles and rules; see what is happening without reading private messages. |
| Member (e.g. a parent, a runner, a colleague) | Take part with little effort, through their own agent, without giving up control, privacy or safety, and without noise. |
| Counterpart member | The same, possibly in another language. |
| Judge | See quickly, in a live product and a three-minute video, that it works, is safe and measurably improves. |
| Platform operator | Run it safely, see costs and abuse, and report scams. |
| Meta (external) | Receive scam reports in a documented format, if Meta chooses to. |

## 3. Business goals

0. Make creating a community app take one pasted link and a short plain-language conversation.
1. Reduce what members spend on short-lived goods (in the kids-gear example app: baby gear) and keep usable items out of waste.
2. Save members time and attention: voice and photo in, a few taps to decide, and no irrelevant noise.
3. Keep children's data private by design.
4. Keep owners in control of every commitment.
5. Show creative, meaningful use of Meta models, including open-weight models.
6. Produce measured evidence of benefit, privacy and safety.

## 4. Business requirements

| ID | Requirement | Priority | Scope | Tier | Where it lives |
|---|---|---|---|---|---|
| BR-01 | Onboard a family by voice, photo or form with language and coarse location. | Must | platform | 1 | family, voice |
| BR-02 | Turn a photo of a pile into separate listings without storing the original. | Must | exchange recipe | 1 | intake |
| BR-03 | Suggest what is outgrown and what is needed next, as logistics only. | Must | exchange recipe | 1 | catalog |
| BR-04 | Find nearby, compatible offers and wants and explain the match. | Must | exchange recipe | 1 | matching |
| BR-05 | Agents negotiate for the owners, at most 3 rounds, in each owner's language. | Must | exchange recipe | 1 | negotiation, language |
| BR-06 | Owners talk only through their own agent (human to agent to agent to human); no direct chat; no contact leaks. | Must | platform | 1 | negotiation/relay, trust/screening |
| BR-07 | Agents never decide commitment, money terms, identity or location reveals, shipping choices or safety exceptions alone; unknown topics default to asking the owner. | Must | platform | 1 | gatekeeper, owner-cards |
| BR-08 | A deal is confirmed only when both owners confirm. | Must | exchange recipe | 1 | owner-cards/confirmations |
| BR-09 | Agents agree pickup, locker or shipping; for shipping they create a label and an appointment; the platform never handles money. | Must | exchange recipe | 1 | logistics |
| BR-10 | Apply visible safety rules for second-hand baby gear; never give medical advice. | Must | exchange recipe | 1 | safety |
| BR-11 | Detect scams, take reports with an evidence bundle, restrict or ban abusers, and export reports in a format designed for Meta without claiming Meta acts on them. | Must | platform | 1 (1:1), 2 (posts) | trust |
| BR-12 | Only Muse agents take part, by construction: agents are platform-hosted and call Meta models only. | Must | platform | 1 | lib/meta, trust |
| BR-13 | Learn from accepts and declines; allow standing rules only for low-risk topics. | Must | platform | 1 | learning, owner-cards/mandates |
| BR-14 | Keep family memory behind an interface; AgentWitch is an optional background provider and the product works without it. | Must | platform | 1 | memory |
| BR-15 | Make everything visible on the platform: live feed, learning curve, cost, privacy and safety panels. | Must | platform | 1 | dashboard |
| BR-16 | Prove behaviour with a clearly disclosed sandbox city and a reproducible benchmark. | Must | platform | 1 | simulation |
| BR-17 | Support voice in and out. | Should | platform | 1 | voice |
| BR-18 | Protect children's data: discard originals, coarse location, encrypted addresses, retention, leak tests. | Must | platform | 1 | intake/crops, family, db, lib |
| BR-19 | Show cost per deal and route work to the cheapest suitable Meta model. | Should | platform | 1 | lib/meta, dashboard |
| BR-20 | Document the path beyond this first step without building it. | Should | platform | 1 | docs |
| BR-21 | A non-technical person can create an app by pasting one link into Muse and answering plain questions; the agent never asks technical questions. | Must | platform | 1 (built), 2 (tried with Muse) | docs/CREATE-AN-APP.md, apps |
| BR-22 | Keep platform and apps separate: an app is `apps/<id>` config plus data, cannot relax the safety invariants, and cannot change platform code. | Must | platform | 1 | lib/app-config, apps, lint |
| BR-23 | Ship example apps to show the platform is general: kids-gear and garden-tools (both exchange) at tier 1, and one non-exchange example (a running club) at tier 2. The platform is not claimed to be general until that example runs. | Should | platform | 1 (two exchange apps), 2 (non-exchange example) | apps |
| BR-24 | Offer the platform as composable primitives, not use-case modules: 1:1 and community communication, learning and evolving, geo, circles and criteria, logs, plus members and roles, owner approval, records, time, workflows, matching, notifications, language, trust. | Must | platform | 1 | docs/PRIMITIVES.md, all slices |
| BR-25 | All member-to-member communication, including in communities, goes through agents: drafted, screened, translated and relayed. No direct human chat or posting. | Must | platform | 1 (1:1), 2 (community) | negotiation/relay, community |
| BR-26 | Community posts are relevance-scored before posting (against the community's purpose) and again before delivery (against each member's interests, circles and location); unrelated or uninteresting posts are not posted and not delivered. | Must | platform | 2 | community, language, lib/meta |
| BR-27 | Form and dissolve circles (groups) by criteria over profile fields, distance, interests, level, availability and role; membership is consent-based. Sensitive attributes are never used to exclude people. | Must | platform | 2 | circles |
| BR-28 | Agents learn from accepts, declines and engagement; changes to settings, rules or circles are proposals that need the owner's approval (personal) or a vote (community), are versioned and reversible, and cannot relax any platform guarantee. | Should | platform | 1 (learning), 3 (evolving) | learning, voting |
| BR-29 | Members can vote on community matters through their agents. | Should | platform | 3 | voting (post-hackathon) |
| BR-30 | Keep only necessary logs: an audit log of decisions (no message text), aggregate metrics, and operational errors without personal data or secrets; members can view, export and erase their own entries. | Must | platform | 1 | lib/audit, dashboard |
| BR-31 | Location is optional per app; when used it is coarse until both parties confirm. | Must | platform | 1 | geo, family |
| BR-32 | Admin announcements and any direct chat are out of scope until after the hackathon. | Info | platform | 3 | docs |
| BR-33 | No criterion, circle, relevance filter or ranking may use gender, religion, ethnicity, health or anything about minors to exclude people from a group, post or opportunity. Such attributes may only define opt-in inclusion groups a member chose to join. Item-fit signals (size, age range) may be used for fit, kept to the minimum (no names, birth dates or photos). Circle criteria use an allow-list of fields, enforced in code. | Must | platform | 1, 2 | circles, lib/app-config, family |
| BR-34 | Relevance filtering has safety valves: system notices (a cancelled deal, a safety warning, a change to my deals) are not posts and always reach the people they concern; each member can see how many posts were filtered for them and review them, and tune their own thresholds; filtered decisions are audited as counts without text; each post is scored once (cached similarity compared with member interests) after a deterministic prefilter, never one model call per member per post; per-community post caps apply. | Must | platform | 2 | community, lib/meta, lib/audit |
| BR-35 | Minimal moderation comes with community posting: a member can report a post, an admin can hide a post or remove a member, and trust screening applies to posts as it does to 1:1 messages. Roles are admin and member. | Must | platform | 2 | community, trust, members |
| BR-36 | Retention and erasure are explicit for every kind of stored data (docs/PRIVACY.md). Erasing a member unlinks their audit entries (the decision counts remain) instead of deleting the append-only log, and removes their own data everywhere else. | Must | platform | 1 | lib/audit, db, family, trust |
| BR-37 | Tier 2 code does not start until tier 1 is demonstrable end to end: simulation and benchmark with the learning curve, the app UI and dashboard, persistent storage, and photo intake (or its explicit, documented cut). Exception decided Oct 28: the Muse-first flow (BR-39 to BR-45) is tier 1. | Info | platform | 1 | docs/PLAN.md |
| BR-39 | The product starts from a QR code: the home page shows a QR code that opens the create-an-app interview on the person's phone, and a copy-paste prompt that does the same for Muse or Meta AI. | Must | platform | 1 | src/app, docs/PLAN.md §2c |
| BR-40 | The create-an-app interview asks one plain question at a time (about six, only about the app itself: what it is for, what a person can do, how it works, what it should never do, name, feel; an app is open to any Muse user, so nothing about who joins, place, languages, handover or price) with tap answers (2–3 suggestions plus "something else", typed or voice) and ends with one yes before anything is built; the model drafts the app config and code validates it. Code sets every rule; the draft cannot relax an always-ask topic; a rejected or failed model draft is replaced by a code draft. Built Oct 28 except voice. The person's own "never do or share" words are kept verbatim as an owner rule, and the summary lists only defaults that apply to the kind of app. | Must | platform | 1 | docs/CREATE-AN-APP.md, src/lib/interview, src/app |
| BR-40a | `/start` works for an AI assistant that can only read a page and hand over a link: its task is in the server HTML and at `/start/agent.md` (markdown also for `Accept: text/markdown`, `?format=md`); it finishes with a draft link of answers that opens the summary with the person's tap on "Build it" as the only way an app is stored. The link carries answers only, read by the same code as a tap and checked by the app schema; it cannot set a rule or carry an instruction. Built Oct 28; not tried with a real Muse. | Must | platform | 1 | docs/CREATE-AN-APP.md, src/lib/interview, src/app/start |
| BR-41 | Apps are data: a created app is a validated config stored by the platform and served at `/agora/app/{app}` with a unique id, without a code change or redeploy; several apps run at once with their data kept apart; repository apps keep working. | Must | platform | 1 | lib/app-config, src/app, db |
| BR-42 | An app is for all Muse users, not a closed group. Each app has a public page for anyone, including a Muse that opens the link (server HTML and markdown at `/app/{app}/agent.md`: what it is, what a person can do, how it works, what it must never do, how Muse should use it; config only, no secret, user data or message text), and a private creator overview with the share QR and link. Only the creator and the users themselves, and their own Muse, see more than the public page. Using the app through Muse alone is not built; how a user confirms always-ask decisions through Muse is open (docs/PLAN.md §2c-ter). | Must | platform | 1 | src/app |
| BR-43 | Each user has a status page at `/agora/app/{app}/muse/{id}` showing what their agent works on in that app, grouped (waiting on you, deals, items, what it did alone, lessons, standing rules) and charted. It follows BR-30: decisions and counts, never other users' message text or addresses. Only that user and their own Muse can see it. A user of a stored app is a party of the app's platform (docs/adr/0007-stored-app-members-are-parties.md), so the groups hold their own data. | Must | platform | 1 | src/app, lib/audit |
| BR-44 | A person's own Muse may connect read-only (app overview, my status, my actions, pending cards) with a per-user key: through a documented HTTP API that Muse can turn into a custom connector, and over MCP if a real Muse is shown to support it (docs/PLAN.md §2d). No tool answers an owner card; always-ask decisions need the person's own tap (BR-07). Keys are per user and app, hashed, shown once, revocable and rate limited. Built Oct 28 (HTTP and MCP); not tried with a real Muse. | Should | platform | 1 | src/app/api, docs/MUSE-CONNECTOR.md |
| BR-45 | Light identity: opening an app's page as a person creates their record and session per app on first use, with no sign-up form; ids are unguessable; every request is authorized by app and user; no secret is carried in a shareable URL. Not real accounts, and disclosed as such. | Must | platform | 1 | src/app, lib |
| BR-46 | A person using a created app can actually use it (docs/PLAN.md §2c-quater): add what they offer or need in the app's own words, see the matcher's candidates, ask their agent to propose a deal, answer their owner cards with their own tap, use the screened relay chat in the deal room and see it all on their status page, under `/app/{app}/...`, scoped to the signed-in light-identity member and to that app's own platform. Only that member sees their cards, deals and status; strangers and other members get 401/404. All labels come from the app's own config and never use swap, free, handover or city words the config does not have. The only matching the platform has is exchange-shaped, so an app for another purpose is served with plain posts and replies and the pages and docs say so; there are no events, calendars, RSVPs or group chat. Confirming still needs the person's own tap in our app. |
| BR-38 | Exchange-specific settings (catalog, handover modes, pricing, negotiation rounds, forecast stages) move into an optional `exchange` section of the app config, with `community` and `circles` as siblings, so apps that are not exchanges are valid. Safety settings (always-ask topics) stay top-level. This is a planned code change, not yet done. | Should | platform | 2 | lib/app-config, apps |

## 5. Non-functional requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-01 | Scale path to millions of families: agents are rows, not processes; matching is indexed, not scanned; async work with idempotency; per-family budgets and a global spend breaker. | Should (design now, build the basics) |
| NFR-02 | Isolation: Fractal Slice Architecture; slices talk only through public APIs and a hub; ports and adapters for model, memory and carrier; feature flags. | Must |
| NFR-03 | Testing: pure and property tests for the state machine and gatekeeper; contract tests for adapters; schema-checked model output with recorded fixtures; golden-set evals; red-team sets; simulation as regression; API journey tests for the main flows (browser end-to-end is not built); CI gates (typecheck, lint, tests, migration check). | Must |
| NFR-04 | Security: per-request authorization on owner, family and negotiation; models propose, code decides; counterpart text is untrusted data; encryption of addresses; rate limits; secret scanning; audit log. | Must |
| NFR-05 | Everything runs without AgentWitch (it is optional); there is no mock mode: the Meta key and two secrets are required (see APP-04). | Must |
| NFR-06 | Judges can run it with only a Meta API key. | Must |
| NFR-07 | Hackathon compliance: public repo at submission, new work only, no health or medical advice, none of the listed generic project types, honest labelling of anything simulated. | Must |
| NFR-08 | Observability: structured logs without personal data and an append-only audit of state changes and owner decisions. | Should |
| NFR-09 | Cost of relevance: scoring community posts must not scale as members times posts in model calls; deterministic prefilter first, one cached similarity per post, per-member and global budgets apply. | Must |

## 6. Constraints and assumptions

- Build window Oct 27 to Nov 4, 2026; submission by Nov 4, 9:00 PM ET.
- Planning documents, requirements and the empty folder scaffolding were written on Oct 26 ET, before the build window; all code is written from Oct 27.
- Meta model access details (API shape, SAM 3.1 access, language quality) are verified early; see ARCHITECTURE.md open questions.
- "Muse only" and "reported to Meta" are limited to what the platform can actually guarantee.

## 7. Out of scope for this first step

Payments or escrow, direct human-to-human chat or posting, admin announcements (after the hackathon), health, medical or
legal guidance, live paid carrier labels, cross-community learning, native mobile apps, large-scale moderation tooling (a minimal
report-and-hide comes with community posting at tier 2). Voting, evolving settings, time/scheduling depth and notifications beyond what exists are designed but come after the hackathon.

## 8. Success measures

1. Owner approval rate rising by round.
2. Match relevance (top 3).
3. Rounds to agreement.
4. Cross-language deal success.
5. Privacy: 0 faces and 0 exact addresses across 100 test photos and listings.
6. Cost per deal on open-weight versus API routing.
7. Items reused and money saved (estimates, labelled).
8. 0 unauthorized commitments on the red-team set.
9. Owner interruptions per deal.
11. Owner cards per confirmed deal, counting every card an owner answers: the attention cost of a deal.
10. Tier 2 only: relevance precision and recall on a labelled set of posts (how many wanted posts were wrongly dropped), the share of posts filtered per member, and owner interruptions per community.

## 9. Index of requirement documents

| Folder | Title | ID prefix |
|---|---|---|
| `.github/` | Automation | GHA |
| `db/` | Database | DB |
| `docs/` | Documentation | DOC |
| `e2e/` | End-to-end tests | E2E |
| `evals/` | Evaluations | EVL |
| `fixtures/` | Fixtures | FIX |
| `src/` | Source | SRC |
| `src/app/` | App routes | APP |
| `src/app/(judge)/` | Judge pages | APP-JDG |
| `src/app/api/` | API routes | API |
| `src/components/` | Design system | CMP |
| `src/features/` | Features | FTR |
| `src/features/catalog/` | Catalog | CAT |
| `src/features/catalog/features/forecast/` | Forecast | CAT-FOR |
| `src/features/catalog/features/items/` | Items | CAT-ITM |
| `src/features/dashboard/` | Dashboard | DSH |
| `src/features/dashboard/features/city-map/` | City map | DSH-MAP |
| `src/features/dashboard/features/cost-panel/` | Cost panel | DSH-CST |
| `src/features/dashboard/features/learning-curve/` | Learning curve | DSH-CRV |
| `src/features/dashboard/features/live-feed/` | Live feed | DSH-FED |
| `src/features/dashboard/features/privacy-panel/` | Privacy panel | DSH-PRV |
| `src/features/dashboard/features/safety-panel/` | Safety panel | DSH-SAF |
| `src/features/family/` | Family | FAM |
| `src/features/family/features/consent/` | Consent | FAM-CON |
| `src/features/family/features/profile/` | Family profile | FAM-PRO |
| `src/features/gatekeeper/` | Gatekeeper | GAT |
| `src/features/gatekeeper/features/classifier/` | Topic classifier | GAT-CLS |
| `src/features/gatekeeper/features/policy/` | Policy | GAT-POL |
| `src/features/intake/` | Intake | INT |
| `src/features/intake/features/capture/` | Capture | INT-CAP |
| `src/features/intake/features/crops/` | Crops | INT-CRP |
| `src/features/intake/features/labeling/` | Labeling | INT-LAB |
| `src/features/intake/features/segmentation/` | Segmentation | INT-SEG |
| `src/features/language/` | Language | LNG |
| `src/features/language/features/detection/` | Detection | LNG-DET |
| `src/features/language/features/translation/` | Translation | LNG-TRN |
| `src/features/learning/` | Learning | LRN |
| `src/features/learning/features/lessons/` | Lessons | LRN-LES |
| `src/features/learning/features/standing-rules/` | Standing rules | LRN-STR |
| `src/features/logistics/` | Logistics | LOG |
| `src/features/logistics/features/carriers/` | Carriers | LOG-CAR |
| `src/features/logistics/features/handoff/` | Handoff | LOG-HND |
| `src/features/logistics/features/shipping/` | Shipping | LOG-SHP |
| `src/features/matching/` | Matching | MAT |
| `src/features/matching/features/candidates/` | Candidates | MAT-CAN |
| `src/features/matching/features/scoring/` | Scoring | MAT-SCO |
| `src/features/memory/` | Memory | MEM |
| `src/features/memory/features/agentwitch/` | AgentWitch provider | MEM-AGW |
| `src/features/memory/features/local/` | Local provider | MEM-LOC |
| `src/features/negotiation/` | Negotiation | NEG |
| `src/features/negotiation/features/deal-room/` | Deal room | NEG-ROM |
| `src/features/negotiation/features/deal-state/` | Deal state | NEG-STA |
| `src/features/negotiation/features/negotiator/` | Negotiator | NEG-NGT |
| `src/features/negotiation/features/offers/` | Offers | NEG-OFR |
| `src/features/negotiation/features/relay/` | Relay | NEG-REL |
| `src/features/owner-cards/` | Owner cards | OWN |
| `src/features/owner-cards/features/confirmations/` | Confirmations | OWN-CNF |
| `src/features/owner-cards/features/mandates/` | Mandates | OWN-MND |
| `src/features/owner-cards/features/questions/` | Owner questions | OWN-QST |
| `src/features/safety/` | Safety | SAF |
| `src/features/safety/features/category-rules/` | Category rules | SAF-RUL |
| `src/features/safety/features/recalls/` | Recalls | SAF-RCL |
| `src/features/simulation/` | Simulation | SIM |
| `src/features/simulation/features/benchmark/` | Benchmark | SIM-BEN |
| `src/features/simulation/features/city/` | City | SIM-CTY |
| `src/features/simulation/features/simulated-owner/` | Simulated owner | SIM-OWN |
| `src/features/trust/` | Trust | TRU |
| `src/features/trust/features/reports/` | Reports | TRU-RPT |
| `src/features/trust/features/reputation/` | Reputation | TRU-REP |
| `src/features/trust/features/scam-signals/` | Scam signals | TRU-SIG |
| `src/features/trust/features/screening/` | Screening | TRU-SCR |
| `src/features/voice/` | Voice | VOI |
| `src/features/voice/features/speak/` | Speak | VOI-SPK |
| `src/features/voice/features/transcribe/` | Transcribe | VOI-TRN |
| `src/features/voice/features/voice-ui/` | Voice UI | VOI-UI |
| `src/hubs/` | Hubs | HUB |
| `src/hubs/DealEvents/` | DealEvents hub | HUB-DEV |
| `src/lib/` | Shared infrastructure | LIB |
| `src/lib/meta/` | Meta model access | LIB-META |
