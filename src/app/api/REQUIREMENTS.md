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
| API-04 | Built routes: items (add and list, with an optional photo draft to keep its picture; withdraw), intake/photo (photo to item drafts; answers a retake, unreadable or unavailable status instead of an error), matches/start, deals (list, read, confirm, relay, handoff with propose, address, fee split, label and tracking), owner-questions answer, owner learning, reports, demo reset, dashboard, sim run, health. Family and voice routes are not built. Apps as data: `POST /api/apps` (create an app from a config; 400 invalid, 409 id taken), `GET /api/apps/{app}` (public join-page summary only). Light identity (BR-45): `POST /api/apps` also sets the creator's session cookie and returns a one-time recovery code; `POST /api/apps/{app}/join` (member), `GET .../me`, `GET .../members` (creator only), `POST .../recover`, `POST .../signout`; 401 without a valid session for that app, 403 for a member on a creator route. Any route takes `?app={id}` to act on that app's own platform (default: the demo app; unknown id is 404). | Must | Listed in the test suite. |

## Out of scope

- Public unauthenticated writes, with disclosed exceptions: `POST /api/apps` lets anyone create an app (rate limited, capped at 200 stored apps; the caller becomes its creator) and `POST /api/apps/{app}/join` lets anyone join (capped at 500 members per app).

## Traceability

NFR-04.
