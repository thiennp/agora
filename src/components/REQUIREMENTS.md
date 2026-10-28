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

## Out of scope

- Business logic.

## Traceability

NFR-02.
