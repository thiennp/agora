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
| NEG-07 | A round is one offer from either agent; the proposal is round 1 and the round limit comes from the app config (`policies.maxNegotiationRounds`). | Must | Both apps' limits are read from config. |
| NEG-08 | Agreement between agents is not a commitment: it only opens confirm cards. Only both owners confirming makes a deal confirmed. | Must | No code path reaches confirmed without both owner decisions. |
| NEG-09 | Notes from the other agent pass the gatekeeper; a note that asks for anything or gives an instruction is dropped, flagged on the deal, and never shown to a model or obeyed. | Must | Injection tests keep the transcript note empty and the deal unconfirmed. |
| NEG-10 | Terms other than free (price or swap) always go to the owner unless that owner chose those exact terms when starting the deal or already approved them in this deal. | Must | Money and swap terms always open an owner question first. |
| NEG-11 | Starting a deal holds both items; if either is not listed the deal is refused and nothing stays held. | Must | A second deal on the same item is refused. |
| NEG-12 | Publish deal events (agreed, owner question, confirmed, declined, expired) on the DealEvents hub. | Must | Event tests. |
| NEG-13 | Not built yet: translation of notes per owner (NEG-03), the human relay channel, the deal-room UI, and a timer that calls expiry. | Info | Tracked in CLAUDE.md status. |

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
