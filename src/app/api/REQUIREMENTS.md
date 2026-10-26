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
| API-03 | Return stable error shapes. | Should | Documented in PROTOCOL.md. |

## Out of scope

- Public unauthenticated writes.

## Traceability

NFR-04.
