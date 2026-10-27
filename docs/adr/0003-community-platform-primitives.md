# ADR 0003 — Agora is a platform of primitives for community apps

Status: accepted (Oct 27, 2026)

## Context
Agora started as a kids' gear exchange, then became "a platform for exchange apps". The owner's intent is broader: a
playground for any community where people act together (learning groups, marathon associations, office apps,
neighbourhood boards), with exchange as one use case. Fixed use-case modules would not scale to such a range.

## Decision
- The platform offers composable **primitives** (docs/PRIMITIVES.md): communication (agent to agent 1:1; community many
  to many), learning and evolving (self-learning, voting), geo, circles and criteria, logs, plus members and roles, owner
  approval, records, time, workflows, matching, notifications, language, trust.
- All member communication, including community posting, goes through agents. Posts are relevance-scored before posting
  and before delivery; unrelated or uninteresting posts are neither posted nor delivered. No direct chat. Admin
  announcements are deferred.
- Evolving and voting only ever produce approved, versioned, reversible proposals and can never relax the platform
  guarantees. Sensitive attributes never exclude people from groups.
- Logs hold decisions and counts, never message text or secrets: audit, metrics, errors with separate retention.
- Recipes (exchange, club, mentoring) are presets of primitives, not separate platform code.
- Hackathon scope: tier 1 is the kids' gear demo; tier 2 (circles, community posting, a non-exchange example) only if the
  gates pass; voting, evolving and richer scheduling come after.

## Consequences
- The app config grows a `community` section and one section per primitive, backwards compatible with today's exchange
  config.
- Existing slices stay; catalog, matching, negotiation and logistics are the exchange use case built on primitives.
- Docs must say "community apps", not "exchange apps", wherever the platform is described.
