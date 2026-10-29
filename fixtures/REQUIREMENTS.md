# Fixtures — business requirements

Folder: `fixtures/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

Deterministic inputs.

## Who it serves

CI; judges.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FIX-01 | Recorded model outputs so tests are deterministic and free. | Must | CI needs no model key. |
| FIX-02 | A seeded sandbox city and sample photos. | Must | The simulation and tests run offline with fixtures. |
| FIX-03 | Contain no real personal data. | Must | Reviewed before commit. |

## Out of scope

- Real user photos.

## Traceability

NFR-03, NFR-06.
