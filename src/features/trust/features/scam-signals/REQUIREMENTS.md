# Scam signals — business requirements

Folder: `src/features/trust/features/scam-signals/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Trust](../../REQUIREMENTS.md)

## Purpose

Recognize patterns typical of scams.

## Who it serves

Trust.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TRU-SIG-01 | Detect off-platform payment requests, pressure, address harvesting, listing mismatch and repeated cancellations. | Must | Scam-script test set is flagged. |
| TRU-SIG-02 | Produce a score and a short explanation. | Must | Explanation is shown to the owner. |
| TRU-SIG-03 | Never auto-ban on a single weak signal. | Should | Bans require a threshold. |
| TRU-SIG-04 | Levels: none below 20, watch from 20, high from 50; weights are documented in code and each signal carries a plain-words explanation. | Must | Scam script set reaches its minimum levels. |

## Out of scope

- Fraud detection beyond this platform.

## Traceability

BR-11.
