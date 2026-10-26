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

## Out of scope

- Content moderation of images.

## Traceability

BR-06, BR-11.
