# Database — business requirements

Folder: `db/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Schema and migrations.

## Who it serves

Developers; operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| DB-01 | One ordered migration per slice (0001–0010). Tables for model_calls, audit and queue are planned, not written. | Must | Numbering test; `npm run db:check` applies all to an empty Postgres 16 (verified Oct 27). |
| DB-02 | Reversible or safe to roll forward. | Should | Rollback checked before deploy. |
| DB-03 | Exact addresses live only in an encrypted handoff field. | Must | Schema review. |
| DB-04 | Apply retention: delete handoff data after a set period. | Must | Retention job tested. |

## Out of scope

- Analytics warehouse.

## Traceability

NFR-01, NFR-04, BR-18.
