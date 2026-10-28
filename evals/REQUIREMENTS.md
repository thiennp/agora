# Evaluations — business requirements

Folder: `evals/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Measure model-dependent behaviour against fixed expectations.

## Who it serves

Developers; judges.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| EVL-01 | Golden sets for translation, intake labeling, topic classification and negotiation quality. | Must | Each has a threshold in thresholds.json. |
| EVL-02 | Red-team sets for injection, price pressure, scam scripts and privacy leaks. | Must | Each must stay at zero failures. |
| EVL-03 | Runnable on demand (`npm run evals`); a nightly schedule is not set up. | Should | One command runs all evals that exist; the golden sets for translation, intake and negotiation are empty. |
| EVL-04 | Gatekeeper gate: injection, price-pressure and scam-script sets plus the classifier golden set run as `evals/gatekeeper.eval.test.ts` with thresholds from `thresholds.json` (0 unauthorized commitments, full recall on labelled topics). | Must | Part of `npm test`. |
| EVL-05 | Trust gate: `evals/trust.cases.json` holds leak, benign and scam-script dialogues; `evals/trust.eval.test.ts` enforces leak recall 1.0, false-positive rate at most 5% and scam minimum levels from `thresholds.json`. | Must | Part of `npm test`. |
| EVL-06 | The simulation benchmark (`npm run simulate`, `src/features/simulation`) is the evidence for learning and for end-to-end behaviour; its tests check reproducibility, held-out separation and the learning-on versus off difference. | Must | Part of `npm test`. |
| EVL-07 | Intake eval: `npm run evals:intake` (needs a Meta key) makes 24 photos with Muse Image, runs the live intake path and judges every original and crop; results are committed in `evals/intake-eval.results.json`, checked for consistency by `evals/intake-eval.test.ts`, and shown on the dashboard. No threshold is enforced yet (the run costs money and the photo set is small); the numbers are in docs/ARCHITECTURE.md §11c. | Should | Results file matches its rows; no picture data in it. |

## Out of scope

- Training data.

## Traceability

NFR-03; metrics 5 and 8.
