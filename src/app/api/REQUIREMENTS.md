# API routes — business requirements

Folder: `src/app/api/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [App routes](../REQUIREMENTS.md)

## Purpose

HTTP endpoints, thin by rule.

## Who it serves

The web app; the simulation.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| API-01 | Authorize every request against owner, family and negotiation. | Must | Cross-family access is refused in tests. |
| API-02 | Validate all input and rate limit. | Must | Invalid or excessive requests are rejected. |
| API-03 | Return stable error shapes. | Should | `{error:{code,message}}`; tested (400, 403, 404, 409, 429, 501). |
| API-04 | Built routes: items (add and list, withdraw), matches/start, deals (list, read, confirm, relay, handoff with propose, address, fee split, label and tracking), owner-questions answer, owner learning, reports, demo reset, dashboard, sim run, health. Intake, family and voice routes are not built. | Must | Listed in the test suite. |

## Out of scope

- Public unauthenticated writes.

## Traceability

NFR-04.
