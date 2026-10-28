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

Status (Oct 28): built for the demo (docs/ARCHITECTURE.md §11c). Photo to drafts works end to end: shrink and strip metadata, pixel and model checks (INT-05), vision names the items with category, size, condition and confidence (INT-01, INT-LAB), SAM 3.1 boxes, crops by box, original overwritten and never stored (INT-02, tested), the owner edits each draft before listing (INT-04). Offline simulation by default; `AGORA_INTAKE=meta` uses the real models (checked live on one generated photo of four items: four drafts in 7.6 s).
Not done: INT-03 as written. Crops are boxes, not masks, so the background stays in, and there is no separate face detector or 100-photo leak test; a person or readable text flagged by the vision model means no picture is kept for that item. INT-01's six-item accuracy test is not run.

## Out of scope

- Storing owner photo libraries; identifying people.

## Traceability

BR-02, BR-18; metric: privacy leak test.

## Sub-features

- [Capture](features/capture/REQUIREMENTS.md)
- [Crops](features/crops/REQUIREMENTS.md)
- [Labeling](features/labeling/REQUIREMENTS.md)
- [Segmentation](features/segmentation/REQUIREMENTS.md)
