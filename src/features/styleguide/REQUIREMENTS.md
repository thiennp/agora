# Styleguide — business requirements

Folder: `src/features/styleguide/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

A public, read-only reference page (`/styleguide`) that shows the shared look and the generic components, so new screens reuse them instead of inventing styles.

## Who it serves

Builders of apps and screens; judges looking at the design.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| STY-01 | Show colors, surfaces, buttons, alerts, badges, avatars, images, modals, form controls, tables and charts. | Should | Each has a section in the index. |
| STY-02 | Read-only and public: no sign-in, no app or owner data, no network calls. | Must | Sample values only. |
| STY-03 | Use only `src/components/ui` and tokens; no app or brand names beyond "Agora". | Must | Lint (no `apps/` import); review. |
| STY-04 | Works at 375 px, in light and dark, and under `AGORA_BASE_PATH`. | Should | No horizontal page scroll; links use `next/link` or fragments. |
| STY-05 | Ships no image files, icon sets or font files; picture slots are drawn in CSS and icons are inline SVG written for this project. | Must | No third-party assets. |
| STY-06 | All page and component code is original to this repository (MIT) or comes from a dependency listed in `THIRD_PARTY_LICENSES.md`. | Must | No copied UI kit or template. |

## Out of scope

- Brand logo and marketing sections; workflow-run demos; anything that needs an account.

## Traceability

NFR-02.
