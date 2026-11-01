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
| API-03 | Return stable error shapes. | Should | `{error:{code,message}}`; tested (400, 401, 403, 404, 409, 429). |
| API-04 | Built routes: items (add and list, with an optional photo draft to keep its picture; withdraw), intake/photo (photo to item drafts; answers a retake, unreadable or unavailable status instead of an error), matches/start, deals (list, read, confirm, relay, handoff with propose, address, fee split, label and tracking), owner-questions answer, owner learning, reports, dashboard, sim run, health. Family and voice routes are not built. Apps as data: `POST /api/apps` (create an app from a config; 400 invalid, 409 id taken), `GET /api/apps/{app}` (public join-page summary only). Light identity (BR-45): `POST /api/apps` also sets the creator's session cookie and returns a one-time recovery code; `POST /api/apps/{app}/join` (member), `GET .../me`, `GET .../members` (creator only), `POST .../recover`, `POST .../signout`; pairing a new computer: `POST .../pair` (start; public; returns code, secret, four digits), `POST .../pair/claim` (the new computer collects its session once approved; 400 once ended), `POST .../pair/info` and `POST .../pair/approve` (need the person's own session; wrong digits 400, burned after three); 401 without a valid session for that app, 403 for a member on a creator route. The interview (BR-40): `POST /api/interview` (answers so far in, next question card or the checked draft with summary out; 400 `invalid_answer`) and `POST /api/interview/build` (a draft in, a stored app with the caller as creator out; 400 `invalid_draft` with the problems; id clashes get a number); both public, with their own tighter rate limits. Muse read API (BR-44): `GET /api/muse/{app}/overview|status|actions|cards` and `POST /api/muse/{app}/mcp` with a per-member Bearer key (401 for any wrong, revoked, other-app or missing key; 429 over the limits; no write method exists); `GET /api/muse/openapi.json`; keys are made and revoked with the person's own session at `GET/POST /api/apps/{app}/muse-key` and `POST .../muse-key/revoke`. Every platform route needs `?app={id}` to act on that app's own platform (400 `app_required` without it; unknown id is 404; there is no default app and no demo reset route). The caller acts as the member their session proves, whatever `as` says (docs/adr/0007-stored-app-members-are-parties.md). | Must | Listed in the test suite. |

## Out of scope

- Public unauthenticated writes, with disclosed exceptions: `POST /api/apps` lets anyone create an app (rate limited, capped at 200 stored apps; the caller becomes its creator) and `POST /api/apps/{app}/join` lets anyone join (capped at 500 members per app).

## Traceability

NFR-04.
