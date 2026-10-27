# Candidates — business requirements

Folder: `src/features/matching/features/candidates/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Matching](../../REQUIREMENTS.md)

## Purpose

Find candidate counterparts quickly without scanning everything.

## Who it serves

Matching.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MAT-CAN-01 | Look up candidates by district, category and size band. | Must | No query scans the full item table. |
| MAT-CAN-02 | Respect each owner hard limits (distance, blocked categories). | Must | Candidates violating a hard limit are never returned. |
| MAT-CAN-03 | Return only the top few candidates per item. | Must | Result size is capped. |
| MAT-CAN-04 | Named districts (no coordinates) match only inside the same name; an unknown distance never satisfies an owner's distance limit. | Must | Tests for named and grid districts. |
| MAT-CAN-05 | The lookup sizes its search per direction: a grid cell is about 5.6 km tall but narrower east-west away from the equator, so the number of cells to search is worked out separately for latitude and longitude. | Must | A candidate 13.6 km east at 52.5 N is found. |
| MAT-CAN-06 | An owner's learned "exact size only" categories exclude candidates of a different size. | Must | Learning and matching tests. |

## Out of scope

- Cross-region matching.

## Traceability

BR-04, NFR-01.
