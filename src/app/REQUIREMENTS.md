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
| APP-09 | The home page (`/`) shows one QR code that opens `<public address>/start`, with the address as text beside it; the address is hardcoded to `https://agentwitch.com/agora`. `/start` says plainly that the interview is not built until it is. The former landing page lives at `/demo`. | Must | `src/lib/qr.test.ts`; the code decodes to the `/start` address in a browser (BarcodeDetector), checked by hand Oct 28. |
| APP-10 | `/app/{app}` (served at `/agora/app/{app}`) is an app's public page for any stored or repository app and 404 for an unknown id. Each app has its own platform (stores, saved state, audit); only the demo app (`APP`) is seeded with the demo scenario, and reset affects only it. The overview, invite and member views come in later steps. | Must | `src/app/api/apps.test.ts`. |
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
