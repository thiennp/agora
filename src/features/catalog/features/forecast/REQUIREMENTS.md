# Forecast — business requirements

Folder: `src/features/catalog/features/forecast/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Catalog](../../REQUIREMENTS.md)

## Purpose

Tell the family what is outgrown and what is likely needed next.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| CAT-FOR-01 | Use a small stage table keyed to age in months and sizes to propose outgrown items and next needs. | Must | A 6-month profile yields a sensible list for clothing sizes and common gear. |
| CAT-FOR-02 | Frame every suggestion as logistics, never as developmental or health guidance. | Must | No suggestion text mentions milestones, health or feeding. |
| CAT-FOR-03 | Let the owner dismiss suggestions and remember the dismissal. | Should | Dismissed suggestions do not return. |
| CAT-FOR-04 | Place a participant in the app's stages from `catalog.stageField` (for example baby age in months) or, for cyclic apps, from the month of the year; stages may wrap the year via `stageCycle`. | Must | Winter wraps in garden-tools; no field and no cycle gives no suggestions. |

## Out of scope

- Growth tracking; milestone advice.

## Traceability

BR-03.
