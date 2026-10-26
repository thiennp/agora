# Negotiation — business requirements

Folder: `src/features/negotiation/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Let the two parents agents reach an agreement within limits the owners set, in each owner language.

## Who it serves

Parent owners; their agents.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| NEG-01 | Every deal follows a defined set of states and at most 3 negotiation rounds. | Must | Illegal transitions are rejected; the 4th round is refused. |
| NEG-02 | Agents exchange structured offers, not free-form promises. | Must | Every agent message carries a valid offer or a labeled question. |
| NEG-03 | Negotiate in each owner language. | Must | Both owners read the full transcript in their own language. |
| NEG-04 | Never commit an owner without the gatekeeper allowing it. | Must | 0 unauthorized commitments across the red-team set. |
| NEG-05 | Expire a deal that the owners do not answer within 24 hours. | Should | Expired deals release their items. |
| NEG-06 | Prevent the same item being promised twice. | Must | Concurrent deals on one item are serialized. |

## Out of scope

- Auctions; multi-item bundles beyond two items; payments.

## Traceability

BR-05, BR-06, BR-07; metrics: rounds to agreement, cross-language success.

## Sub-features

- [Deal room](features/deal-room/REQUIREMENTS.md)
- [Deal state](features/deal-state/REQUIREMENTS.md)
- [Negotiator](features/negotiator/REQUIREMENTS.md)
- [Offers](features/offers/REQUIREMENTS.md)
- [Relay](features/relay/REQUIREMENTS.md)
