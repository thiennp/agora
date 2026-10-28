# ADR 0004 — Tier gate, optional exchange section, retention and relevance safety valves

Status: accepted (Oct 27, 2026). Docs only; the config reshaping and the `family` to `members` rename are planned code changes and have not happened: the code, tables (`0001_family.sql`) and events still use `family` and `familyId`.

## Context
After ADR 0003 made Agora a platform of primitives for community apps, a review of the requirements found gaps: tier 1 was not
yet demonstrable, the app config still treated exchange as the default shape, the sensitive-attribute rule clashed with a
field the demo uses, relevance filtering had no safeguards, community posting had no moderation, and erasure conflicted with an
append-only audit log.

## Decision
- Tier 2 starts only when tier 1 runs end to end (BR-37).
- Exchange settings move into an optional `exchange` config section with `community` and `circles` as siblings; safety settings
  stay top-level (BR-38, code change planned). `family` becomes `members` with it.
- Sensitive attributes may not exclude people; item-fit signals are allowed and minimal; circle criteria use a field allow-list (BR-33).
- Relevance filtering has safety valves and bounded cost (BR-34, NFR-09); posting comes with minimal moderation (BR-35).
- Retention and erasure are explicit; erasure unlinks audit entries instead of deleting the log (BR-36, docs/PRIVACY.md).
- Requirements carry a Scope (platform or exchange recipe) and a Tier column; the pitch keeps the first 2:45 on kids' gear.

## Consequences
- The next code is tier 1 work (simulation and benchmark, UI and dashboard, storage, intake), then the config reshaping, then tier 2.
- Docs state "only exchange apps are valid today" until the reshaping lands.
