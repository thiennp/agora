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
| OWN-05 | Cards are created from deal events on the DealEvents hub (question opened, agreed by agents) and closed when the deal is declined, expires or is confirmed; owner cards never call negotiation internals. | Must | Event-driven tests. |
| OWN-06 | Every card action checks that the card belongs to the acting owner and cannot be repeated. | Must | Wrong-owner and repeat attempts are refused. |
| OWN-07 | Question wording comes from fixed templates over structured facts, never from counterparty text. | Must | A card contains no counterparty free text. |
| OWN-08 | Not built yet: card UI components, notifications, the handoff card (OWN-CNF-03) and withdrawing after confirmation (OWN-CNF-04); card text uses fixed wording in en, de, es and vi and is translated (or kept in English if translation fails) for other languages. | Info | Tracked in CLAUDE.md status. |
| OWN-09 | Owner cards publish OwnerAnswered (topic and yes or no) and OwnerDecision (confirm or decline with reason code) on the hub; learning consumes them. | Must | Event tests. |

## Out of scope

- Chat with the counterparty.

## Traceability

BR-07, BR-08, BR-13.

## Sub-features

- [Confirmations](features/confirmations/REQUIREMENTS.md)
- [Mandates](features/mandates/REQUIREMENTS.md)
- [Owner questions](features/questions/REQUIREMENTS.md)
