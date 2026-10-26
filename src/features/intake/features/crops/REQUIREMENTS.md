# Crops — business requirements

Folder: `src/features/intake/features/crops/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Intake](../../REQUIREMENTS.md)

## Purpose

Produce the only image that is ever stored or published.

## Who it serves

Intake pipeline; owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-CRP-01 | Create a crop per item with background and any person removed. | Must | Crops contain only the item. |
| INT-CRP-02 | Discard the original immediately after cropping. | Must | Verified by a test that checks no original path exists. |
| INT-CRP-03 | Let the owner view and replace a crop. | Should | Replacement updates the listing. |
| INT-CRP-04 | Run a face and address check on every crop. | Must | A crop failing the check is rejected and the owner is told why. |

## Out of scope

- Editing or retouching images.

## Traceability

BR-02, BR-18.
