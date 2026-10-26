# Translation — business requirements

Folder: `src/features/language/features/translation/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Language](../../REQUIREMENTS.md)

## Purpose

Translate messages faithfully.

## Who it serves

Relay; negotiation.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LNG-TRN-01 | Translate between any pair of supported languages. | Must | Test set passes. |
| LNG-TRN-02 | Preserve numbers, units, sizes and dates exactly. | Must | Numeric fidelity test. |
| LNG-TRN-03 | Measure round-trip quality. | Should | Reported by the eval suite. |

## Out of scope

- Document translation.

## Traceability

BR-05.
