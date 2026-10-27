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
| NEG-NGT-05 | The decision for each turn is a pure function; a model only writes a short validated note and falls back to a template on invalid output, a harmful note or a spent budget. | Must | Meta client tests with bad replies. |
| NEG-NGT-06 | Owner mandate: allowed terms, minimum condition, availability windows, language, and optional opening terms chosen by the owner. | Must | Policy tests. |
| NEG-NGT-07 | When the offered pickup window is not inside the owner's free time, counter with the part that overlaps it; with no overlap, with the owner's first window. | Must | Policy tests; found by the simulation. |

## Out of scope

- Hard-bargaining or persuasion tactics.

## Traceability

BR-05, BR-07.
