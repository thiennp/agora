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

## Out of scope

- Cross-region matching.

## Traceability

BR-04, NFR-01.
