# End-to-end tests — business requirements

Folder: `e2e/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Protect the three key flows.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| E2E-01 | Cover intake to match. | Must | Not built: the specs were empty and were removed. The API journey is covered by `src/app/api/api.test.ts`. |
| E2E-02 | Cover negotiate, owner question and confirm. | Must | Not built: the specs were empty and were removed. The API journey is covered by `src/app/api/api.test.ts`. |
| E2E-03 | Cover handoff and shipping. | Must | Not built: the specs were empty and were removed. The API journey is covered by `src/app/api/api.test.ts`. |

| E2E-04 | Cover the Muse-first flow: QR home page, interview, app created, overview and invite, a second person joins, member status shows data, the Muse read API with a member key, and nothing a Muse holds can answer a card. | Must | Built as an API-level test in mock mode: `src/app/api/muse-first-flow.test.ts`. No browser is driven. |

## Out of scope

- Visual regression suites.

## Traceability

NFR-03.
