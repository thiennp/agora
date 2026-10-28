# App routes — business requirements

Folder: `src/app/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

Next.js entry layer: pages and thin route handlers.

## Who it serves

Parent owners; judges.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| APP-01 | Route handlers only authenticate, validate, call a slice facade and respond. | Must | No business logic in route files. |
| APP-02 | Every page works at phone width. | Must | No horizontal scrolling at 375 px. |
| APP-03 | Every page has empty, loading and error states. | Must | States exist for each page. |
| APP-04 | The app runs in demo mode only until accounts exist; live mode refuses. | Must | `AGORA_MODE=live` returns 501 `auth_not_built`; tested. |
| APP-06 | After each successful change the demo saves its state and restores it on start; reset deletes it. | Must | `src/app/api/persistence.test.ts`. |
| APP-07 | Every page uses the shared design tokens and works in light and dark. | Should | Tokens live in `globals.css`; the page classes read them; the theme toggle sets the `dark` class. |
| APP-08 | A public, read-only `/styleguide` page shows the shared components. | Should | Opens without sign-in, works under `AGORA_BASE_PATH`, holds no demo or owner data. |
| APP-09 | The home page (`/`) shows one QR code that opens `<public address>/start`, with the address as text beside it; the address is hardcoded to `https://agentwitch.com/agora`. `/start` runs the interview (APP-11). The former landing page lives at `/demo`. | Must | `src/lib/qr.test.ts`; the code decodes to the `/start` address in a browser (BarcodeDetector), checked by hand Oct 28. |
| APP-10 | `/app/{app}` (served at `/agora/app/{app}`) is an app's public page for any stored or repository app and 404 for an unknown id. Each app has its own platform (stores, saved state, audit); only the demo app (`APP`) is seeded with the demo scenario, and reset affects only it. What the page shows depends on who asks (APP-12). | Must | `src/app/api/apps.test.ts`. |
| APP-13 | `/app/{app}/muse/{id}` is a member's status page (BR-43, step 5): waiting on you (open questions, confirm cards, agent suggestions), deals and items (each with a count bar chart and a list), what the agent did alone (counts and a 7-day activity line chart), lessons, standing rules. Only the member whose id it is, proved by that app's session cookie, can open it; another member, the creator looking at someone else, a stranger, a forged cookie, an unknown id, an unknown app and a demo app all get the same 404. It holds decisions, counts and short labels, never message text, addresses or another member's data. Every group has an empty state; the page says the audit log is not written yet. Read-only (answering cards is not here). No horizontal scroll at 375 px. | Must | `src/app/api/member-status.test.ts` (member, other member, creator, stranger, forged and other-app cookies; empty member; grouping and counts; no other persona's id); checked by eye at 375 px. |
| APP-12 | `/app/{app}` is one address with three views chosen only by the app's session cookie (BR-42, step 4): a stranger gets the join page (name, purpose, features, rules, a Join button that makes a member and shows the recovery code once), a member the member view, the creator the overview with the invite QR, a share button and the member list (names, roles, join dates). The invite link is the page's own address with no secret, so a screenshot or forwarded link opens only the join page; it shows no member data. Repository apps show the public page without invite. Unknown id: 404. Loading, error and empty (no members yet) states; no horizontal scroll at 375 px. | Must | `src/app/api/app-page.test.ts` (creator, member, stranger, other-app and forged sessions, unknown app, no secret in the invite URL); checked by eye at 375 px. |
| APP-13 | `/app/{app}` is public: anyone, including an assistant, gets what the app is, what a person can do, how it works and its rules in server HTML, and as markdown at `/app/{app}/agent.md` (also `Accept: text/markdown`, `?format=md`), built from the config only. A person who opens it in a browser is set up on first use with no form; a page that is only read creates nothing. The creator's overview (share QR, people using the app) shows only with their session. | Must | `src/app/api/public-app-page.test.ts`. |
| APP-14 | A created app is usable (BR-46): `/app/{app}/items`, `/cards`, `/deals` and `/deals/{id}` are the demo's items, cards, deals and deal-room pages (`src/app/_pages/*Body.tsx`, shared with `(owner)/*`) in the scope of the signed-in member (`memberScope`, `src/app/_composition/member-scope.ts`): the app's own platform with both persona keys resolving to that one member, the same rule the API routes apply, and the app's own words (`appVocabulary`). A visitor without a session for the app, another app's session, or a repository app gets the 404 page. `/app/{app}/layout.tsx` makes an unknown app a real 404 and shows the app's own bar (name, Posts, Cards, Conversations, My agent) instead of the demo nav and the Mia/Jonas switch; the demo footer is not shown inside an app. No `loading.tsx` above `/app` (a Suspense boundary would stream a 200 before `notFound()`). | Must | `src/app/api/created-app.test.ts`. |
| APP-06 | Light identity for stored apps (BR-45): creating an app makes the caller its creator and joining makes a member, each with a session cookie (HttpOnly, SameSite=Lax) for that app only; every platform route of a stored app needs that session, creator-only routes refuse members, and writes need a human session. Recovery with a one-time code on a new phone. Disclosed as not real accounts. | Must | `src/app/api/identity.test.ts`. |
| APP-12 | `/start` shows an AI assistant its task without JavaScript: the brief in the server HTML (with a `<noscript>` note for people), `/start/agent.md` and `Accept: text/markdown`/`text/plain`/`?format=md` as markdown, a `rel=alternate` link, and a line on the home page. `/start?purpose=…` (a draft link) opens the interview with those answers, ending at the summary; nothing is stored before the tap. | Must | `src/app/api/start-agent.test.ts`. |
| APP-11 | `/start` runs the create-an-app interview (BR-40) at phone width: one question card at a time with 2–3 tap answers plus "something else" typed, a progress line, go back, a summary with "Build it" as the one yes, and on yes a page with a link to the new app and the one-time recovery code with the light-identity notice. Answers resume after a reload. | Must | `src/app/api/interview.test.ts` (flow and build); checked by hand at 375 px Oct 28. |
| APP-05 | Personas in the demo are not authentication and say so. | Must | Footer states demo mode; slices still check the acting party. |

## Out of scope

- Business logic.

## Traceability

NFR-02, NFR-04.

## Contents

- [Styleguide page](../features/styleguide/REQUIREMENTS.md)
- [Judge pages]((judge)/REQUIREMENTS.md)
- [Owner pages]((owner)/REQUIREMENTS.md)
- [API routes](api/REQUIREMENTS.md)
