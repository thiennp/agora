# Scoring — business requirements

Folder: `src/features/matching/features/scoring/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Matching](../../REQUIREMENTS.md)

## Purpose

Rank candidates deterministically.

## Who it serves

Matching.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MAT-SCO-01 | Score on category, size fit, condition, distance and timing. | Must | Same inputs give the same score. |
| MAT-SCO-02 | Down-weight patterns the owner previously declined. | Should | A declined pattern lowers later scores. |
| MAT-SCO-03 | Expose the factors behind a score for explanation. | Must | Every score has a breakdown. |

## Out of scope

- Machine-learned ranking.

## Traceability

BR-04, BR-13.
