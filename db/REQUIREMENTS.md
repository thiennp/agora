# Database — business requirements

Folder: `db/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Schema and migrations.

## Who it serves

Developers; operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| DB-01 | One ordered migration per slice (0001–0010 exist). Tables for model_calls, audit and the queue are planned, not written. | Must | Migrations are numbered 0001.. without gaps or duplicates and none is empty (`db/migrations.test.ts`); they apply on an empty database. |
| DB-02 | Reversible or safe to roll forward. | Should | Rollback checked before deploy. |
| DB-03 | Exact addresses live only in an encrypted handoff field. | Must | Schema review. |
| DB-04 | Apply retention: delete handoff data after a set period. | Must | Retention job tested. |

## Out of scope

- Analytics warehouse.

## Traceability

NFR-01, NFR-04, BR-18.
