# Detection — business requirements

Folder: `src/features/language/features/detection/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Language](../../REQUIREMENTS.md)

## Purpose

Know what language the input is in.

## Who it serves

Voice; relay.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LNG-DET-01 | Detect the language of text or transcription. | Must | Correct on the golden set. |
| LNG-DET-02 | Ask the owner when uncertain. | Should | Uncertainty shows a picker. |
| LNG-DET-03 | Detect deterministically first (script marks and stopwords for en, de, es, fr, vi); ask a model only when unsure; accept the model's answer only if it names one of the app's languages, otherwise report unknown. | Must | Unknown for gibberish and for languages outside the candidates. |

## Out of scope

- Dialect handling.

## Traceability

BR-05.
