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

## Out of scope

- Voice calls; file attachments.

## Traceability

BR-06.
