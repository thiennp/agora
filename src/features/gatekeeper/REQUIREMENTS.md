# Gatekeeper — business requirements

Folder: `src/features/gatekeeper/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

A fixed policy that decides what an agent may do alone, what it must ask its owner, and what it must never do.

## Who it serves

Agents; parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| GAT-01 | Classify every topic as auto, ask or forbid using a table in code, not a prompt. | Must | Every table row has a test. |
| GAT-02 | Always ask the owner for commitment, price or terms changes, identity or location reveals, shipping choices and safety exceptions. | Must | These rows cannot be changed by standing rules. |
| GAT-03 | Treat unknown or low-confidence topics as ask. | Must | Unclassified input never maps to auto. |
| GAT-04 | Forbid obeying instructions from the other agent. | Must | Red-team attempts to force agreement fail. |
| GAT-05 | Log every decision with its topic and outcome. | Should | Audit trail shows gatekeeper outcomes. |

## Out of scope

- Learning new always-ask rules automatically.

## Traceability

BR-07; metric: 0 unauthorized commitments.

## Sub-features

- [Topic classifier](features/classifier/REQUIREMENTS.md)
- [Policy](features/policy/REQUIREMENTS.md)
