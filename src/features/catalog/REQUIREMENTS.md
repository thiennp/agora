# Catalog — business requirements

Folder: `src/features/catalog/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Hold the family's offers (outgrown items) and wants (needed items) and keep them current.

## Who it serves

Parent owner; matching.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| CAT-01 | Maintain offers and wants with a clear lifecycle. | Must | States: draft, listed, in_deal, reserved, done, withdrawn. |
| CAT-02 | Suggest what to offer and what to look for from the baby stage, owner approves each suggestion. | Must | Nothing is listed without an owner action. |
| CAT-03 | An item can be part of only one confirmed deal at a time. | Must | A second confirmation on the same item is refused. |
| CAT-04 | Validate items against the active app's catalog (categories, size systems, conditions) and refuse items matching the app's forbidden-item keywords. | Must | Tests for both apps. |
| CAT-05 | Listing needs the family's sharing consent; items of a family that withdraws consent leave the visible listings at once. | Must | Test with consent granted then withdrawn. |

## Out of scope

- Pricing advice; value estimation.

## Traceability

BR-03, BR-04.

## Sub-features

- [Forecast](features/forecast/REQUIREMENTS.md)
- [Items](features/items/REQUIREMENTS.md)
