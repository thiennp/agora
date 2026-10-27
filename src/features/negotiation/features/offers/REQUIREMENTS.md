# Offers — business requirements

Folder: `src/features/negotiation/features/offers/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Negotiation](../../REQUIREMENTS.md)

## Purpose

Define what an agent may propose.

## Who it serves

Negotiator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| NEG-OFR-01 | An offer states the item, terms (free or price), condition, pickup window and a short note. | Must | Offers failing validation are rejected. |
| NEG-OFR-02 | Any change of terms is flagged as needing the owner. | Must | A price or terms change always opens an owner question. |
| NEG-OFR-03 | Keep offers small and comparable across languages. | Should | The structured part is language-neutral. |
| NEG-OFR-04 | Offer terms are free, swap (says what for) or price (amount and currency, settled by the owners outside the platform), limited by the app's pricing mode. | Must | A swap-only app rejects free and price offers. |
| NEG-OFR-05 | An outgoing note that mentions prices, contacts, places or instructions is rejected whoever wrote it. | Must | `noteIsHarmless` tests. |

## Out of scope

- Counter-offers on multiple items at once.

## Traceability

BR-05, BR-07.
