# Learning — business requirements

Folder: `src/features/learning/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Get better for each family from their accepts and declines.

## Who it serves

Parent owner; agents.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LRN-01 | Turn decision reasons into lessons with evidence and confidence. | Must | Each lesson cites the decisions behind it. |
| LRN-02 | Use lessons to adjust matching and negotiation. | Must | Approval rate rises across rounds in the benchmark. |
| LRN-03 | Let the owner see and delete what was learned. | Must | A "what I learned about you" view exists. |
| LRN-04 | Never use lessons to relax always-ask topics. | Must | Test confirms. |
| LRN-05 | Learning listens to the DealEvents hub (OwnerDecision, OwnerAnswered, DealConfirmed, DealDeclined, DealExpired, HandoffFinished) and handles events one after another, in order, so lessons never overwrite each other. | Must | Concurrent-event tests. |
| LRN-06 | Lessons can only make an owner's own limits stricter: a smaller distance (never above the base; 10 km cap if none), a higher condition floor, exact sizes. There is no way to express topics, terms or commitments. | Must | Tighten-only property test over random limits. |
| LRN-07 | Lessons act on behaviour only from the second sighting (confidence 0.75). Owner-facing view lists the lesson in plain words, how often it was seen and a three-level confidence. | Must | Adjustment and view tests. |
| LRN-08 | Measured by the simulation (docs/SIMULATION.md): owner approval on held-out episodes rises from about 0.32 to about 0.7 with learning, but mostly by proposing fewer deals; confirmed deals per 100 wants rise modestly. When owners' preferences loosen, tightening alone loses coverage and owner-approved relaxation wins back about two thirds of it. Not done: a lessons view screen, negotiation reading learned timing preferences, owner-card screens for stretch cards, and a product workflow that performs the stretch lookup. | Info | Tracked in CLAUDE.md status. |
| LRN-09 | When learned limits leave a want without a match, the owner can be asked, in plain words and without naming anyone, whether to look at a match that only a learned limit excluded; nothing starts without their yes, and the deal still needs both owners' confirmation. The caller does the two-step lookup (learned limits first, then the owner's own base limits) using `blockedByLearned`; only the simulation does so today. | Must | Stretch offer tests; simulation. |
| LRN-10 | Stretch cards are offered only for a match just beyond a learned limit (within 30% on distance, one condition step; a size mismatch for an exact-size category), at most three wait at once, and after a no that reason is skipped for the next five opportunities. A yes clears the back-off. | Must | Margin and back-off tests; the first version showed about 1% approval without them. |
| LRN-11 | A stretch lesson (reason code and category only) is written only when an owner-approved stretch deal is confirmed by both owners. For each decline lesson the effective count is declines minus twice the confirmed stretch deals for the same reason and category: from 2 the limit tightens fully, at 1 half a step, at 0 not at all, and new declines tighten it again. The result is never looser than the owner's own base limit and can be deleted like any lesson. | Must | Adjustment and property tests. |

## Out of scope

- Sharing lessons between families (roadmap).

## Traceability

BR-13; metric: approval-rate curve.

## Sub-features

- [Lessons](features/lessons/REQUIREMENTS.md)
- [Standing rules](features/standing-rules/REQUIREMENTS.md)
