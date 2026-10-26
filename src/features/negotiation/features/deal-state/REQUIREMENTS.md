# Deal state — business requirements

Folder: `src/features/negotiation/features/deal-state/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Negotiation](../../REQUIREMENTS.md)

## Purpose

Own the life of a deal from proposal to completion.

## Who it serves

Negotiation; owner-cards; logistics.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| NEG-STA-01 | States: proposed, countered, agreed_by_agents, awaiting_owner_input, awaiting_owners, confirmed, declined, expired, handoff, completed, not_completed, reported. | Must | Each transition is covered by a test. |
| NEG-STA-02 | Reject illegal transitions. | Must | Property tests show no illegal path reaches confirmed. |
| NEG-STA-03 | Persist every transition with a timestamp. | Must | The full history of a deal can be replayed. |
| NEG-STA-04 | Never reach confirmed unless both owners confirmed. | Must | Invariant test. |

## Out of scope

- Workflow customization.

## Traceability

BR-05, BR-08, NFR-03.
