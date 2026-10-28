# Features — business requirements

Folder: `src/features/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

All product capabilities as slices, each with nested sub-features.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FTR-01 | Each slice has a public-api and an internal folder; sub-features repeat the same shape, at most two levels deep. | Must | Structure validation passes. |
| FTR-02 | Each slice and sub-feature can be deleted with its route wiring without breaking unrelated features. | Must | Deletion test holds. |
| FTR-03 | Each folder has a REQUIREMENTS.md that traces to the top-level requirements. | Must | No folder without one. |

## Out of scope

- Code that is not a product capability.

## Traceability

NFR-02.

## Contents

- [Catalog](catalog/REQUIREMENTS.md)
- [Dashboard](dashboard/REQUIREMENTS.md)
- [Family](family/REQUIREMENTS.md)
- [Gatekeeper](gatekeeper/REQUIREMENTS.md)
- [Intake](intake/REQUIREMENTS.md)
- [Language](language/REQUIREMENTS.md)
- [Learning](learning/REQUIREMENTS.md)
- [Logistics](logistics/REQUIREMENTS.md)
- [Matching](matching/REQUIREMENTS.md)
- [Memory](memory/REQUIREMENTS.md)
- [Negotiation](negotiation/REQUIREMENTS.md)
- [Owner cards](owner-cards/REQUIREMENTS.md)
- [Safety](safety/REQUIREMENTS.md)
- [Simulation](simulation/REQUIREMENTS.md)
- [Styleguide](styleguide/REQUIREMENTS.md)
- [Trust](trust/REQUIREMENTS.md)
- [Voice](voice/REQUIREMENTS.md)
