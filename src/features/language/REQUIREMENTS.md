# Language — business requirements

Folder: `src/features/language/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Let two parents who share no language make a deal.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LNG-01 | Support three languages chosen after the early quality test. | Must | Round-trip checks meet the threshold in each. |
| LNG-02 | Show owners both the original and the translation. | Must | Both visible. |
| LNG-03 | Flag uncertain translations rather than hide them. | Should | Low-confidence translations are marked. |

## Out of scope

- More than three languages in v1.

## Traceability

BR-05; gate G0.

## Sub-features

- [Detection](features/detection/REQUIREMENTS.md)
- [Translation](features/translation/REQUIREMENTS.md)
