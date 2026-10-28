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
Measured Oct 28 on 24 generated photos with the live models (docs/ARCHITECTURE.md §11c, `npm run evals:intake`, shown on the judge dashboard): 11 of 12 six-item piles became exactly six drafts, 97.2% of the expected items were found and named (INT-01 met on this set, not on real photos); 0 of 87 kept crops were judged to show a person or readable text by a separate Muse Spark call after the per-crop check was added (the first run, without it, leaked 6 of 80 crops showing a person).
Not done: INT-03 as written. Crops are boxes, not masks, so the background stays in; the leak test is 24 generated photos judged by the same model family, not 100 photos and not a face detector; children are not in the test photos.

## Out of scope

- Storing owner photo libraries; identifying people.

## Traceability

BR-02, BR-18; metric: privacy leak test.

## Sub-features

- [Capture](features/capture/REQUIREMENTS.md)
- [Crops](features/crops/REQUIREMENTS.md)
- [Labeling](features/labeling/REQUIREMENTS.md)
- [Segmentation](features/segmentation/REQUIREMENTS.md)
