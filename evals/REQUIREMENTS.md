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
| EVL-03 | Runnable on demand and nightly. | Should | One command runs all. |

## Out of scope

- Training data.

## Traceability

NFR-03; metrics 5 and 8.
