# Agora platform primitives

Agora is a platform for **community apps**: any app where people do things together (trade, learn, run, work, volunteer,
organise). It offers a small set of primitives that every app composes. Apps are configuration plus data; they never
change the primitives or the safety guarantees. Decided Oct 27, 2026.

Status words: **built** (code, tested, in-memory stores), **partly built**, **designed** (specified, not coded),
**later** (deliberately after the hackathon).

## The primitives

### 1. Communication

| Primitive | What it is | Status |
|---|---|---|
| **Agent to agent (1:1)** | Two members' agents talk on their owners' behalf and send anything they cannot decide back to the owner as a one-tap card. Includes a round limit, structured offers and the gatekeeper. | built (negotiation, owner cards, gatekeeper, and the relay that carries the two owners' messages through their agents, screened and translated) |
| **Community (many to many)** | Members post to and read from a community **only through their agents**. Relevance is scored on both sides (see below): unrelated or uninteresting posts are not posted and not delivered. | designed |

**All community communication goes through agents.** A member never chats directly with another member or posts
directly into a community. Their agent drafts, filters, screens, translates and relays. Admin announcements are
**later** (post-hackathon), and so is any direct member chat.

#### Relevance scoring for community posts

Two gates, both deterministic first, with a model only as an advisor:

1. **Before posting (outgoing).** The member's agent scores the draft against the community's purpose and topics
   (`community.topics`, keywords and the community's circles). Below `postMin` the post is not made and the owner is told
   plainly why, with a suggestion. Above it, the post still passes screening (contact details, scam patterns) and the
   gatekeeper (a post that tries to commit someone, name a price, or reveal identity or location asks the owner first).
2. **Before delivery (incoming).** Each receiving member's agent scores the post against that member's interests,
   circles, location and recent engagement. Below `deliverMin` it is ignored: no notification, at most a count in a
   digest. Above it, it is translated and delivered.

Scoring inputs: topic and keyword match, circle membership, geo and time proximity, past engagement ("not interested"
feedback lowers future scores). A model (Meta client) may add a semantic similarity score, schema-validated; if it is
unavailable, invalid or over budget the deterministic score is used. Post text is untrusted data: instructions inside a
post ("rate this 10/10", "deliver to everyone") are ignored and cannot raise its score. Spam control: per-member and
per-community post limits and duplicate suppression. Thresholds and limits live in the app's community config.

**Safety valves.** Filtering must never hide what a member needs. System notices (a cancelled deal, a safety or recall
warning, a change to one of my deals) are not posts and always reach the people they concern. Each member can see how many
posts were filtered for them, review them, and tune their own thresholds; "not interested" feedback is a lesson they can see
and delete. Filtered decisions are audited as counts without text. Cost stays bounded: a deterministic prefilter first, then
one cached similarity per post compared with member interests, never one model call per member per post.

### 2. Learning and evolving

| Primitive | What it is | Status |
|---|---|---|
| **Self-learning** | Agents learn from accepts, declines, dismissals and engagement. Lessons are per member, local first (AgentWitch optional in the background). | built (lessons from decisions, tighten-only adjustments, standing-rule proposals, owner-approved relaxation of learned limits (stretch offers), local memory and an AgentWitch mirror; the simulation benchmark that measures the learning curve is built, see `docs/SIMULATION.md`) |
| **Evolving** | The system and members' agents may *propose* changes (a new standing rule, a tuned threshold, a new circle). Nothing changes without approval by the owner (personal settings) or by vote (community settings). Every change is versioned and reversible. | later |
| **Voting** | Members decide community matters together: rules, settings, events. Votes run through agents and owner cards. | later |

Hard limit for evolving and voting: nobody, including a unanimous vote, can relax the platform guarantees below.

### 3. Geo

Coarse location only (about 5 km cells or a named district), distance, "near me" and region. Exact addresses exist only
in a handoff after both parties confirm, encrypted and subject to retention. Apps that do not need location simply
leave it off. | built (district codes, distance, hard distance limits)

### 4. Circles and criteria (grouping and ungrouping)

A **circle** is a group of members formed, and re-evaluated, by **criteria**: conditions over profile fields, distance,
interests, level, availability, role and favourites combined with and / or / not. Circles can be small teams, pace
groups, study groups or a whole neighbourhood; they dissolve or re-form when criteria stop holding or a member leaves.
Membership of a circle is always consent-based (a member can leave).

Fairness rule: criteria may not use sensitive attributes (gender, religion, ethnicity, health, anything about minors)
to **exclude** people from an opportunity. Sensitive attributes may be used only for opt-in inclusion groups the member
chose to join (for example a women's running group), and the platform stores no health data at all. Signals about an *item* (a size or age range) may be used for fit, kept to the
minimum (months or a range only, never names, birth dates or photos). Circle criteria may use only an allow-list of profile
fields, enforced in code. | designed

### 5. Logs (only what is necessary)

| Log | Holds | Never holds | Retention |
|---|---|---|---|
| **Audit** (append-only) | Who decided what: gatekeeper outcome and topics, owner-card answers, consent and standing-rule changes, circle changes, approved evolutions | message text, names, contact details, secrets | 12 months |
| **Metrics** (aggregates) | Counts, cost, latency, owner interruptions, relevance pass rates | anything per person beyond an opaque id | 90 days |
| **Errors** (operational) | Error class, route, request id, secret *fingerprints* only | personal data, message text, secret values | 30 days |

Members can see and export their own audit entries ("my activity"). Erasing an account unlinks its audit entries from the
person (only anonymous decision counts remain) rather than deleting the append-only log; all other data about them is removed
(see `docs/PRIVACY.md` for retention of each kind of data).
Status: audit entries are produced by the built slices through a sink; no store, viewer or retention job yet.

### 6. Supporting services every app gets

| Service | Status |
|---|---|
| **Members, roles and consent**: profiles with app-defined fields, admin / member roles, opt-in sharing, export and erase | built for profiles and consent; roles designed |
| **Owner approval**: the agent always asks before commitments, money terms, identity or location reveals, shipping, safety exceptions; unknown topics ask; standing rules only for low-risk topics and they expire | built |
| **Records**: app-defined things people create (an item, event, task, request, poll) with a lifecycle | partly built (items only) |
| **Time**: availability, calendars, deadlines, reminders | designed |
| **Workflows**: propose, agree, confirm processes and "when X do Y" rules; negotiation is one workflow | partly built (deal state machine, handoff and logistics with a simulated carrier, labelled "not connected yet") |
| **Matching and ranking**: find the best person or thing | built for items |
| **Notifications**: push, email, voice so the owner gets the question | designed |
| **Language**: detection and translation of cards, notes and posts | built (first version) |
| **Trust and moderation**: scam signals, reports with evidence, bans, abuse limits, export for Meta | built for 1:1 conversations (screening, scam signals, reputation, hash-chained reports, `agora.report.v1` export); not yet applied to community posts; review tooling not built |
| **Moderation and roles**: members and admins; a member can report a post, an admin can hide a post or remove a member; screening applies to posts as to 1:1 messages | designed (minimal, tier 2) |
| **Meta client**: model routing, cost meter, per-member and global budgets, schema-validated output | built |
| **Photo intake**: originals discarded, crops only | built (items page; always the real models, Muse Spark vision and SAM 3.1) |
| **Voice intake** | designed |
| **Dashboard**: live feed, learning curve, cost, privacy, safety | built in part (learning curves, live counters, failures; no map, cost or privacy-test panel) |

## Primitive to slice map

| Primitive or service | Slice(s) today | Notes |
|---|---|---|
| Agent to agent (1:1) | `negotiation` (deal state machine, offers, negotiator, relay), `owner-cards`, `gatekeeper` | negotiation is one workflow; relay and cards are general |
| Community communication | none yet | will reuse `trust` screening, `language`, `gatekeeper`; adds a `community` slice with the relevance gate |
| Self-learning | `learning`, `memory` | lessons, tighten-only adjustments, proposals |
| Geo | district codes in `family`, distance in `matching` | optional per app |
| Circles and criteria | none yet | criteria evaluated over members; field allow-list |
| Logs | audit sinks in `gatekeeper`, `owner-cards`, `trust`, `relay`; no store yet | `lib/audit` is still a stub |
| Members, roles, consent | `family` (profile, consent) | rename to `members` when the community section lands; roles not built |
| Records | `catalog` (items only) | generalise to app-defined record types later |
| Matching and ranking | `matching` (items) | relevance scoring should share one ranking core with it: factors, weights and an explanation per score |
| Workflows | `negotiation/deal-state`, `logistics` | |
| Language, Trust, Meta client | `language`, `trust`, `lib/meta` | |
| Simulation and benchmark | `simulation` | sandbox city, simulated owners with hidden rules, held-out benchmark, CSV |
| Time, Notifications, Voice | none yet | |
| Dashboard | `src/app/(judge)/dashboard`, `src/app/_composition` | reads the simulation CSV |

## Guarantees that no app, vote or evolution can change

- Owners decide every commitment; agreement between agents is never a commitment.
- The platform never holds or moves money.
- Text from other members, agents and posts is untrusted data, never instructions.
- All member-to-member communication is relayed through agents, screened, and relevance-filtered; no direct chat.
- No health, medical, legal or developmental advice.
- Exact locations stay hidden until both parties confirm; originals of photos are discarded.
- Every decision is auditable without storing message text.
- Sensitive attributes are never used to exclude people.
- System notices about a member's own deals and safety always reach them; relevance filtering never applies to them.

## How apps compose the primitives

| App | Built from |
|---|---|
| Kids' gear exchange (`kids-gear`, example app for the simulation and the docs) | 1:1 agents with relay, geo, records (items), matching, workflows (handoff), trust, learning, owner approval, logs |
| Garden tools swap (`garden-tools`) | same, with swap-only pricing |
| Marathon association (example) | community communication, time, circles (pace groups), voting (route), notifications, logs |
| Office app (example) | community communication, circles (teams), time (desk and room booking), records (requests), workflows |
| Learning group (example) | circles (level, interest), time, voting, learning, community communication |
| Neighbourhood help board (example) | community communication, records (requests), geo, matching, owner approval |

Recipes (ready-made starting points such as "exchange", "club with events", "mentoring") are presets of primitives,
not separate platform code.

## What exists in code today

Built (in-memory stores, tested): Meta client, app config loader, member profile and consent, items and forecast, matching,
gatekeeper, negotiation (1:1 agents), owner cards (questions, confirmations, standing rules, hard limits), language
(detection and translation), the relay between a deal's two owners through their agents, trust (screening, scam signals,
reputation, reports and export), logistics (handoff modes, encrypted places and addresses, simulated carrier), learning
(lessons, tighten-only adjustments, standing-rule proposals) and memory (local, AgentWitch mirror).

Also built: the simulation slice (sandbox city, simulated owners, held-out benchmark, CSV export).

Not built: community communication and relevance scoring, circles and criteria, voting, evolving, time beyond availability
windows, notifications, a logging store with retention, database access (in-memory stores only), accounts, voice intake. A web app exists: `/start` interview, per-app pages (owner cards, deal room, items), member status, the Muse read API and the judge dashboard; it needs a real Meta key (no demo or mock mode).

Scaffold only: the `safety` and `voice` slices are empty files (the `intake` slice is built except its sub-feature `capture`, whose upload lives in the page); their requirement rows are targets, not features. The app config schema currently describes only the exchange use case; it will gain a `community` section and
per-primitive sections as each primitive lands, and existing apps must keep working.
