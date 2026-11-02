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
| APP-04 | There is no demo or mock mode: the app needs `META_API_KEY`, `FIELD_ENCRYPTION_SECRET` and `REPORT_EXPORT_SECRET` (secrets at least 16 characters) and fails by name if one is missing; translation, photo intake and the interviewer always use the real Meta Model API through `metaClientFor` (`src/app/_composition/meta.ts`). Every platform route needs `?app=<id>` of a stored app (400 `app_required` without it, 404 for an unknown app) and that app's session. (Superseded Oct 29: the earlier demo-only mode and the 501 `auth_not_built` path are removed.) | Must | `src/lib/env.test.ts`; `src/app/api/*.test.ts` (tests use test doubles for the model and set test secrets). |
| APP-06 | After each successful change an app saves its own state and restores it on start (there is no reset route). | Must | `src/app/api/persistence.test.ts`. |
| APP-07 | Every page uses the shared design tokens and works in light and dark. | Should | Tokens live in `globals.css`; the page classes read them; the theme toggle sets the `dark` class. |
| APP-08 | A public, read-only `/styleguide` page shows the shared components. | Should | Opens without sign-in, works under `AGORA_BASE_PATH`, holds no app or owner data. |
| APP-09 | The home page (`/`) shows one copy-paste prompt for Muse or Meta AI (`CopyPrompt`) that points the assistant at `<public address>/start/agent.md` (the brief it follows); there is no QR code, because assistants do not know what to do with one. The address is hardcoded to `https://agentwitch.com/agora`. The assistant runs the interview in chat. (The former landing page `/demo` is removed.) | Must | `src/app/api/muse-first-flow.test.ts` (the page holds the brief address and no QR). |
| APP-10 | `/app/{app}` (served at `/agora/app/{app}`) is an app's public page for any stored or repository app and 404 for an unknown id. Each app has its own platform (stores, saved state, audit); every app starts empty; no app is seeded. What the page shows depends on who asks (APP-12). | Must | `src/app/api/apps.test.ts`. |
| APP-13 | `/app/{app}/muse/{id}` is a member's status page (BR-43, step 5): waiting on you (open questions, confirm cards, agent suggestions), deals and items (each with a count bar chart and a list), what the agent did alone (counts and a 7-day activity line chart), lessons, standing rules. Only the member whose id it is, proved by that app's session cookie, can open it; another member, the creator looking at someone else, a stranger, a forged cookie, an unknown id, an unknown app and a repository app all get the same 404. It holds decisions, counts and short labels, never message text, addresses or another member's data. Every group has an empty state. "What the agent did alone" lists the member's own log (plain words, newest first, linked to the deal). The waiting cards are answered on this page with the person's own tap (same components as `/cards`); the page refreshes itself every few seconds. No horizontal scroll at 375 px. Every page under `/app/{app}` shows a live "your agent has a question for you" line for a member (`GET /api/apps/{app}/waiting`, polled every 4 s, session cookie only). | Must | `src/app/api/member-status.test.ts` (member, other member, creator, stranger, forged and other-app cookies; empty member; grouping and counts; no other member's id); checked by eye at 375 px. |
| APP-14 | One agent index at `/agent.md` and `/llms.txt` (markdown) lists every entry point an assistant can use: how to create an app (`/start/agent.md`), how to use one (`/app/{app}/agent.md`), the read-only API and MCP, and the rules that never change; it names no way to build or to answer a card. | Should | `src/app/api/start-agent.test.ts`. |
| APP-15 | `/app/{app}` shows its creator an admin dashboard (share link, members, links to the app's pages); only the creator's session sees it. Everyone else sees the public page. `/app/{app}/admin` is the door: it redirects the creator to the dashboard and shows anyone else only the app's name and a recovery-code form, since the assistant that built the app holds the first session. The admin's assistant reads the same app through a read-only Muse key (BR-44). | Must | by hand; `src/app/api/app-page.test.ts` (creator vs stranger). |
| APP-12 | An AI assistant gets its task at `/start/agent.md` (markdown, also for `Accept: text/markdown`/`text/plain`/`?format=md`) and a line on the home page. The assistant interviews the person in chat; after the person types "yes" it posts the answers to `/api/interview` and the checked draft to `/api/interview/build`, then hands the person the public address, the admin address and the recovery code. An assistant that can only open links (Meta AI's sandbox blocks POST, Nov 2) gives the person `/start?draft=…`: the page decodes the answers, shows the checked summary, and the person's tap on Build it is the only thing that stores the app. There is no question-by-question human page. | Must | `src/app/api/start-agent.test.ts`. |
| APP-13 | `/app/{app}` is public: anyone, including an assistant, gets what the app is, what a person can do, how it works and its rules in server HTML, and as markdown at `/app/{app}/agent.md` (also `Accept: text/markdown`, `?format=md`), built from the config only. A person who opens it in a browser is set up on first use with no form; a page that is only read creates nothing. The creator's overview (share link, people using the app) shows only with their session. | Must | `src/app/api/public-app-page.test.ts`. |
| APP-14 | A created app is usable (BR-46): `/app/{app}/items`, `/cards`, `/deals` and `/deals/{id}` are the app's items, cards, deals and deal-room pages (`src/app/_pages/*Body.tsx`) in the scope of the signed-in member (`memberScope`, `src/app/_composition/member-scope.ts`): the app's own platform with the route's `as` keys both resolving to that one member, the same rule the API routes apply, and the app's own words (`appVocabulary`). A visitor without a session for the app, another app's session, or a repository app gets the 404 page. `/app/{app}/layout.tsx` makes an unknown app a real 404 and shows the app's own bar (name, Posts, Cards, Conversations, My agent) instead of the site nav; the site footer is not shown inside an app. No `loading.tsx` above `/app` (a Suspense boundary would stream a 200 before `notFound()`). | Must | `src/app/api/created-app.test.ts`. |
| APP-06 | Light identity for stored apps (BR-45): creating an app makes the caller its creator and joining makes a member, each with a session cookie (HttpOnly, SameSite=Lax) for that app only; every platform route of a stored app needs that session, creator-only routes refuse members, and writes need a human session. Recovery with a one-time code on a new phone. Sessions slide: 30 days after last use (the cookie lasts a year, the server decides). Pairing a new computer (`/app/{app}/pair`, approved at `/app/{app}/pair/{code}`): a copy-paste prompt (`CopyPrompt`), four digits, the person's own tap on a signed-in device. Disclosed as not real accounts. | Must | `src/app/api/identity.test.ts`, `src/lib/identity/identity.test.ts`. |
| APP-12 | `/start` shows an AI assistant its task without JavaScript: the brief in the server HTML (with a `<noscript>` note for people), `/start/agent.md` and `Accept: text/markdown`/`text/plain`/`?format=md` as markdown, a `rel=alternate` link, and a line on the home page. `/start?purpose=…` (a draft link) opens the interview with those answers, ending at the summary; nothing is stored before the tap. | Must | `src/app/api/start-agent.test.ts`. |
| APP-11 | The create-an-app interview (BR-40) runs in the assistant's chat (APP-12): one plain question at a time, a summary, and the person's typed "yes" as the one approval. The build call stores the app and makes the caller its creator and returns the one-time recovery code with the light-identity notice. | Must | `src/app/api/interview.test.ts` (flow and build). |
| APP-05 | Light identity is not real authentication and says so (APP-06); slices still check the acting party. (Superseded Oct 29: the built-in personas are removed.) | Must | Identity notice on the build page; slices check the acting party. |

## Out of scope

- Business logic.

## Traceability

NFR-02, NFR-04.

## Contents

- [Styleguide page](../features/styleguide/REQUIREMENTS.md)
- [Judge pages]((judge)/REQUIREMENTS.md)
- [API routes](api/REQUIREMENTS.md)
