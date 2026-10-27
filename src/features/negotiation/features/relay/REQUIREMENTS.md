# Relay — business requirements

Folder: `src/features/negotiation/features/relay/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Negotiation](../../REQUIREMENTS.md)

## Purpose

Carry words between the two owners without letting them talk directly.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| NEG-REL-01 | An owner speaks only to their own agent, which relays to the other agent and then to the other owner. | Must | No direct human-to-human channel exists. |
| NEG-REL-02 | Relay translates faithfully and does not rewrite meaning. | Must | Round-trip translation tests meet the threshold. |
| NEG-REL-03 | Screen every relayed message for contact details, links and payment requests. | Must | Blocked or redacted before delivery; decision logged. |
| NEG-REL-04 | Show both owners the original and the relayed text. | Should | Both versions are visible in the deal room. |
| NEG-REL-05 | Screen the owner's text, translate faithfully (numbers, sizes, dates preserved, sane length), then screen the translation: anything the translator added holds the message; on translation failure deliver the original and mark it untranslated. | Must | Relay tests for each path. |
| NEG-REL-06 | Chat never changes a deal: when money, commitment, place or identity come up the receiver is told that only agent offers and owner cards count. | Must | Notice test; deal state unchanged. |
| NEG-REL-07 | Messages are limited to 1000 characters and 30 per hour per sender and deal; banned agents cannot relay; only the deal's two owners can read or send. | Must | Authorization and rate tests. |
| NEG-REL-08 | The database stores only the hash and screened text of a message, never the raw text; relay builds the evidence for reports. | Must | Migration 0005; report test. |

## Out of scope

- Voice calls; file attachments.

## Traceability

BR-06.
