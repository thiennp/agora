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
| LNG-TRN-04 | The text goes to the model as JSON data and the reply must be a validated object, so instructions inside the text cannot change the output; a translation that changes a number, size, date or time is rejected. | Must | Injection-shaped and numeric-fidelity tests. |
| LNG-TRN-05 | Mark translations the model is unsure about (confidence below 0.7) as uncertain. | Should | Low-confidence test. |

## Out of scope

- Document translation.

## Traceability

BR-05.
