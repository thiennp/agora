# Intake — business requirements

Folder: `src/features/intake/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Turn a photo or voice note into ready-to-review listings without ever keeping the original.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-01 | Accept a photo of a pile and produce one listing draft per item. | Must | A test pile of 6 items yields 6 drafts. |
| INT-02 | Never store the original photo. | Must | No original is readable after the request completes; verified by test. |
| INT-03 | Only item crops, with background and any person removed, leave the intake step. | Must | 0 faces and 0 addresses across 100 test photos. |
| INT-04 | Let the owner correct label, size and condition before publishing. | Should | Edits are saved to the draft. |
| INT-05 | Ask for another photo when the image is poor instead of guessing. | Must | Blurred or dark inputs trigger a retake prompt. |

Status: not built (scaffold only), decided to build on Oct 28. The calls are confirmed live (docs/ARCHITECTURE.md §13): Muse Spark names the items from the photo, SAM 3.1 returns a box per item from a one-noun concept prompt, crops are cut from the boxes. INT-03 as written ("background removed") is met by box crops only in part: masks are base85 rasters whose decoding is not yet read, so background removal is a stretch and the person/face check must run on the crop. The demo's items form (`/items`) stands in until intake lands.

## Out of scope

- Storing owner photo libraries; identifying people.

## Traceability

BR-02, BR-18; metric: privacy leak test.

## Sub-features

- [Capture](features/capture/REQUIREMENTS.md)
- [Crops](features/crops/REQUIREMENTS.md)
- [Labeling](features/labeling/REQUIREMENTS.md)
- [Segmentation](features/segmentation/REQUIREMENTS.md)
