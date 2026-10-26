# Negotiator — business requirements

Folder: `src/features/negotiation/features/negotiator/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Negotiation](../../REQUIREMENTS.md)

## Purpose

Act for one owner inside that owner's limits.

## Who it serves

Parent owner's agent.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| NEG-NGT-01 | Propose and counter within the owner mandate (distance, condition floor, timing). | Must | No proposal ever exceeds a mandate limit. |
| NEG-NGT-02 | Never state facts about an item that are not in the listing. | Must | Red-team questions about unknown facts get "ask the owner". |
| NEG-NGT-03 | Summarise progress for the owner in plain words. | Should | Each round has a one-line summary. |
| NEG-NGT-04 | Stop and ask the owner when the gatekeeper says so. | Must | The agent pauses on any ask topic. |

## Out of scope

- Hard-bargaining or persuasion tactics.

## Traceability

BR-05, BR-07.
