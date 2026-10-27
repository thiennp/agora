# Screening — business requirements

Folder: `src/features/trust/features/screening/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Trust](../../REQUIREMENTS.md)

## Purpose

Stop contact details and risky requests passing through the relay.

## Who it serves

Relay.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TRU-SCR-01 | Detect phone numbers, emails, addresses, links and payment requests. | Must | Red-team set passes its threshold. |
| TRU-SCR-02 | Block or redact according to the setting and tell the sender why. | Must | Sender sees the reason. |
| TRU-SCR-03 | Keep false positives low enough not to frustrate normal conversation. | Should | False-positive rate measured on sample dialogues. |
| TRU-SCR-04 | Phones, emails, handles and links are redacted in place (or the message blocked by setting); addresses and payment requests are always blocked; a leak found only after undoing obfuscation ("name at mail dot com", spelled-out digits) blocks the whole message. | Must | `evals/trust.eval.test.ts` leak set. |
| TRU-SCR-05 | Dates, times, sizes, ages and prices are never read as phone numbers. | Must | Benign dialogue set has zero flags. |

## Out of scope

- Content moderation of images.

## Traceability

BR-06, BR-11.
