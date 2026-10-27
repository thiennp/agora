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

The first example app, and the hackathon demo, is a **kids' gear exchange**: parents buy a lot of baby and kids gear that
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
1. Reduce what members spend on short-lived goods (in the demo app: baby gear) and keep usable items out of waste.
2. Save members time and attention: voice and photo in, a few taps to decide, and no irrelevant noise.
3. Keep children's data private by design.
4. Keep owners in control of every commitment.
5. Show creative, meaningful use of Meta models, including open-weight models.
6. Produce measured evidence of benefit, privacy and safety.

## 4. Business requirements

| ID | Requirement | Priority | Where it lives |
|---|---|---|---|
| BR-01 | Onboard a family by voice, photo or form with language and coarse location. | Must | family, voice |
| BR-02 | Turn a photo of a pile into separate listings without storing the original. | Must | intake |
| BR-03 | Suggest what is outgrown and what is needed next, as logistics only. | Must | catalog |
| BR-04 | Find nearby, compatible offers and wants and explain the match. | Must | matching |
| BR-05 | Agents negotiate for the owners, at most 3 rounds, in each owner's language. | Must | negotiation, language |
| BR-06 | Owners talk only through their own agent (human to agent to agent to human); no direct chat; no contact leaks. | Must | negotiation/relay, trust/screening |
| BR-07 | Agents never decide commitment, money terms, identity or location reveals, shipping choices or safety exceptions alone; unknown topics default to asking the owner. | Must | gatekeeper, owner-cards |
| BR-08 | A deal is confirmed only when both owners confirm. | Must | owner-cards/confirmations |
| BR-09 | Agents agree pickup, locker or shipping; for shipping they create a label and an appointment; the platform never handles money. | Must | logistics |
| BR-10 | Apply visible safety rules for second-hand baby gear; never give medical advice. | Must | safety |
| BR-11 | Detect scams, take reports with an evidence bundle, restrict or ban abusers, and export reports in a format designed for Meta without claiming Meta acts on them. | Must | trust |
| BR-12 | Only Muse agents take part, by construction: agents are platform-hosted and call Meta models only. | Must | lib/meta, trust |
| BR-13 | Learn from accepts and declines; allow standing rules only for low-risk topics. | Must | learning, owner-cards/mandates |
| BR-14 | Keep family memory behind an interface; AgentWitch is an optional background provider and the product works without it. | Must | memory |
| BR-15 | Make everything visible on the platform: live feed, learning curve, cost, privacy and safety panels. | Must | dashboard |
| BR-16 | Prove behaviour with a clearly disclosed sandbox city and a reproducible benchmark. | Must | simulation |
| BR-17 | Support voice in and out. | Should | voice |
| BR-18 | Protect children's data: discard originals, coarse location, encrypted addresses, retention, leak tests. | Must | intake/crops, family, db, lib |
| BR-19 | Show cost per deal and route work to the cheapest suitable Meta model. | Should | lib/meta, dashboard |
| BR-20 | Document the path beyond this first step without building it. | Should | docs |
| BR-21 | A non-technical person can create an app by pasting one link into Muse and answering plain questions; the agent never asks technical questions. | Must | docs/CREATE-AN-APP.md, apps |
| BR-22 | Keep platform and apps separate: an app is `apps/<id>` config plus data, cannot relax the safety invariants, and cannot change platform code. | Must | lib/app-config, apps, lint |
| BR-23 | Ship at least two example apps in different domains to show the platform is general. | Should | apps |
| BR-24 | Offer the platform as composable primitives, not use-case modules: 1:1 and community communication, learning and evolving, geo, circles and criteria, logs, plus members and roles, owner approval, records, time, workflows, matching, notifications, language, trust. | Must | docs/PRIMITIVES.md, all slices |
| BR-25 | All member-to-member communication, including in communities, goes through agents: drafted, screened, translated and relayed. No direct human chat or posting. | Must | negotiation/relay, community |
| BR-26 | Community posts are relevance-scored before posting (against the community's purpose) and again before delivery (against each member's interests, circles and location); unrelated or uninteresting posts are not posted and not delivered. | Must | community, language, lib/meta |
| BR-27 | Form and dissolve circles (groups) by criteria over profile fields, distance, interests, level, availability and role; membership is consent-based. Sensitive attributes are never used to exclude people. | Must | circles |
| BR-28 | Agents learn from accepts, declines and engagement; changes to settings, rules or circles are proposals that need the owner's approval (personal) or a vote (community), are versioned and reversible, and cannot relax any platform guarantee. | Should | learning, voting |
| BR-29 | Members can vote on community matters through their agents. | Should | voting (post-hackathon) |
| BR-30 | Keep only necessary logs: an audit log of decisions (no message text), aggregate metrics, and operational errors without personal data or secrets; members can view, export and erase their own entries. | Must | lib/audit, dashboard |
| BR-31 | Location is optional per app; when used it is coarse until both parties confirm. | Must | geo, family |
| BR-32 | Admin announcements and any direct chat are out of scope until after the hackathon. | Info | docs |

## 5. Non-functional requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-01 | Scale path to millions of families: agents are rows, not processes; matching is indexed, not scanned; async work with idempotency; per-family budgets and a global spend breaker. | Should (design now, build the basics) |
| NFR-02 | Isolation: Fractal Slice Architecture; slices talk only through public APIs and a hub; ports and adapters for model, memory and carrier; feature flags. | Must |
| NFR-03 | Testing: pure and property tests for the state machine and gatekeeper; contract tests for adapters; schema-checked model output with recorded fixtures; golden-set evals; red-team sets; simulation as regression; three end-to-end flows; CI gates. | Must |
| NFR-04 | Security: per-request authorization on owner, family and negotiation; models propose, code decides; counterpart text is untrusted data; encryption of addresses; rate limits; secret scanning; audit log. | Must |
| NFR-05 | Mock mode: everything runs without AgentWitch. | Must |
| NFR-06 | Judges can run it with only a Meta API key. | Must |
| NFR-07 | Hackathon compliance: public repo at submission, new work only, no health or medical advice, none of the listed generic project types, honest labelling of anything simulated. | Must |
| NFR-08 | Observability: structured logs without personal data and an append-only audit of state changes and owner decisions. | Should |

## 6. Constraints and assumptions

- Build window Oct 27 to Nov 4, 2026; submission by Nov 4, 9:00 PM ET.
- Planning documents, requirements and the empty folder scaffolding were written on Oct 26 ET, before the build window; all code is written from Oct 27.
- Meta model access details (API shape, SAM 3.1 access, language quality) are verified early; see ARCHITECTURE.md open questions.
- "Muse only" and "reported to Meta" are limited to what the platform can actually guarantee.

## 7. Out of scope for this first step

Payments or escrow, direct human-to-human chat or posting, admin announcements (after the hackathon), health, medical or
legal guidance, live paid carrier labels, cross-community learning, native mobile apps, moderation tooling for a large user
base. Voting, evolving settings, time/scheduling depth and notifications beyond the demo are designed but come after the hackathon.

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
| `src/app/(owner)/` | Owner pages | APP-OWN |
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
