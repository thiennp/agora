# Owner cards — business requirements

Folder: `src/features/owner-cards/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

The human's control surface: questions, confirmations and standing rules.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| OWN-01 | Every decision the agent cannot make alone reaches the owner as a card. | Must | No ask-topic is resolved without an owner action. |
| OWN-02 | Cards are answerable in one tap with suggested answers. | Must | Each card has 2 to 3 suggested answers. |
| OWN-03 | Cards show only the information needed to decide. | Must | Counterparty data is redacted. |
| OWN-04 | Owner can review and revoke any standing rule. | Must | Revocation takes effect immediately. |

## Out of scope

- Chat with the counterparty.

## Traceability

BR-07, BR-08, BR-13.

## Sub-features

- [Confirmations](features/confirmations/REQUIREMENTS.md)
- [Mandates](features/mandates/REQUIREMENTS.md)
- [Owner questions](features/questions/REQUIREMENTS.md)
