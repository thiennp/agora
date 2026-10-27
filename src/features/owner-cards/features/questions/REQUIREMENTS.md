# Owner questions — business requirements

Folder: `src/features/owner-cards/features/questions/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Owner cards](../../REQUIREMENTS.md)

## Purpose

Ask the owner one clear question at a time.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| OWN-QST-01 | Show the counterparty request redacted, with suggested answers and a deadline. | Must | Card content matches the open question. |
| OWN-QST-02 | Notify the owner and expire the question after the deadline. | Must | Expired questions return the deal to its previous state safely. |
| OWN-QST-03 | Record the answer and its reason. | Must | Answer is stored with a timestamp. |
| OWN-QST-04 | "Remember this" is offered only when the topic can become a standing rule; a refused request changes nothing (the question stays open). | Must | Always-ask topics never offer it. |

## Out of scope

- Free-text conversations.

## Traceability

BR-07.
