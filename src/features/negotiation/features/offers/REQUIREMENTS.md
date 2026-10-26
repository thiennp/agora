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

## Out of scope

- Counter-offers on multiple items at once.

## Traceability

BR-05, BR-07.
