# Agora — business requirements

Top-level requirements for the whole project. Every folder below contains its own `REQUIREMENTS.md` that refines
these for its capability. Requirement IDs are stable: `BR-nn` (business), `NFR-nn` (non-functional), and
`<PREFIX>-nn` inside a folder.

## 1. Vision

Agora is a playground platform: anyone can stand up an agent-to-agent exchange app with minimal effort by
configuring a catalog, policies and a theme. The first example app, described below, is a kids' gear exchange.

Parents buy a lot of baby and kids gear that is outgrown in months. Agora lets each parent's Muse agent trade
outgrown gear for free or by agreement with nearby parents, in their own languages, while the parent stays in
control of every decision that matters. It is a first step: the same agent-to-agent exchange can later cover
other categories, communities and trusted commerce.

## 2. Users

| User | Needs |
|---|---|
| Parent owner | Pass on outgrown gear and find what is needed next with little effort, without giving up control, privacy or safety. |
| Counterpart parent | The same, possibly in another language. |
| Judge | See quickly, in a live product and a three-minute video, that it works, is safe and measurably improves. |
| Platform operator | Run it safely, see costs and abuse, and report scams. |
| Meta (external) | Receive scam reports in a documented format, if Meta chooses to. |

## 3. Business goals

1. Reduce what families spend on short-lived baby gear and keep usable items out of waste.
2. Save parents time: voice and photo in, a few taps to decide.
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

Payments or escrow, direct human-to-human chat, health or developmental guidance, live paid carrier labels, cross-family
learning, non-baby categories, native mobile apps, moderation tooling for a large user base.

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
