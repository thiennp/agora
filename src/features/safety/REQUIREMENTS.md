# Safety — business requirements

Folder: `src/features/safety/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Keep second-hand baby gear safe by applying simple, visible rules.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SAF-01 | Apply category rules to every item before it is listed or accepted. | Must | Items in restricted categories raise a flag. |
| SAF-02 | Make all safety output advisory logistics, never medical advice. | Must | No health claims anywhere. |
| SAF-03 | Default the recommendation to decline when information is missing. | Must | Missing crash history yields decline. |

## Out of scope

- Medical, health, feeding or developmental guidance.

## Traceability

BR-10; compliance rule: no health advice.

## Sub-features

- [Category rules](features/category-rules/REQUIREMENTS.md)
- [Recalls](features/recalls/REQUIREMENTS.md)
