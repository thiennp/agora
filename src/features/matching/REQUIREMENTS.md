# Matching — business requirements

Folder: `src/features/matching/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Find nearby, compatible counterparts and explain why they fit.

## Who it serves

Parent owner; negotiation.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MAT-01 | Return the best few candidate matches for an item. | Must | Top-3 relevance meets the benchmark target. |
| MAT-02 | Show a short human-readable reason for each match. | Must | Every match has a reason line. |
| MAT-03 | Let owners dismiss a match permanently. | Should | Dismissed matches never reappear. |
| MAT-04 | Say so plainly when there is no match. | Must | Empty state explains what to try. |

## Out of scope

- Search by free text; recommendations unrelated to the family profile.

## Traceability

BR-04; metric: match relevance.

## Sub-features

- [Candidates](features/candidates/REQUIREMENTS.md)
- [Scoring](features/scoring/REQUIREMENTS.md)
