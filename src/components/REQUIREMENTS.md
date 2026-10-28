# Design system — business requirements

Folder: `src/components/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

Shared presentational building blocks.

## Who it serves

All pages.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| CMP-01 | Accessible, mobile-first components. | Must | Keyboard and screen-reader basics work. |
| CMP-03 | `ui/` holds generic, Tailwind-styled components (button, badge, alert, avatar, modal, form controls, table, card and page surfaces) that know nothing about any app. | Must | No import of `apps/` or a feature; tokens only, no brand text. |
| CMP-04 | Every `ui/` component is original code under the repository's MIT licence; icons are inline SVG drawn for the project; fonts are the system stack. | Must | No template, UI kit or asset is copied in; `THIRD_PARTY_LICENSES.md` lists dependencies. |
| CMP-02 | Never import a feature internal folder. | Must | Lint enforced. |

| CMP-JOIN | `JoinForm` (join on the invite page, then the recovery code once) and `CopyLink` (share or copy the invite link) hold no secret and call only the join API. | Must | `src/app/api/app-page.test.ts`. |
| CMP-MUSEKEY | `MuseKeyPanel` makes, shows once and revokes the member's read-only Muse key through the session-only key API; it never stores the key. | Should | `src/app/api/muse.test.ts` (API). |
| CMP-SCOPE | `ScopeProvider`/`useScope` (`ScopeContext.tsx`, `scope.ts`) tell the shared owner components which app they run in: API calls get `?app=` (the person comes from the session cookie, never from the URL or body), links go under `/app/{app}`, wording (`Vocabulary`) and the name for the other side come from the app. Demo pages run in `demoScope` and read exactly as before. `AppNav` is the bar inside an app; `SiteFooter` hides the demo notice there. | Must | `created-app.test.ts`. |

## Out of scope

- Business logic.

## Traceability

NFR-02.
