# Reports — business requirements

Folder: `src/features/trust/features/reports/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Trust](../../REQUIREMENTS.md)

## Purpose

Capture and export evidence about suspected scams.

## Who it serves

Parent owner; platform operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TRU-RPT-01 | Owner can report a deal in two taps. | Must | Report flow is short. |
| TRU-RPT-02 | Build an evidence bundle of message hashes, timestamps and flags. | Must | Bundle is hash-chained for tamper evidence. |
| TRU-RPT-03 | Export in a documented JSON format intended for Meta. | Must | Format is documented in docs/PROTOCOL.md. |
| TRU-RPT-04 | Protect the reporter identity from the reported party. | Must | Reported party cannot see who reported. |

## Out of scope

- Automatic submission to Meta; legal case handling.

## Traceability

BR-11.
