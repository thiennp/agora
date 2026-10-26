# Labeling — business requirements

Folder: `src/features/intake/features/labeling/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Intake](../../REQUIREMENTS.md)

## Purpose

Describe each item: category, size, condition.

## Who it serves

Intake pipeline; owner (reviewer).

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-LAB-01 | Assign category, size range and condition with a confidence value. | Must | Every draft carries all three fields and a confidence. |
| INT-LAB-02 | Route low-confidence labels to the owner for confirmation. | Must | Labels under the threshold are marked "please check". |
| INT-LAB-03 | Make no claims about safety or health from a photo. | Must | Labels never include such statements. |

## Out of scope

- Brand authentication or price estimation.

## Traceability

BR-02, BR-10.
