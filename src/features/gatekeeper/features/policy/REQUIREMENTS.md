# Policy — business requirements

Folder: `src/features/gatekeeper/features/policy/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Gatekeeper](../../REQUIREMENTS.md)

## Purpose

The pure decision function and its table.

## Who it serves

Gatekeeper.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| GAT-POL-01 | decide(topic, context, mandate) returns auto, ask or forbid. | Must | Exhaustive tests over the table. |
| GAT-POL-02 | Mandates can only move low-risk topics between auto and ask. | Must | Attempts to relax always-ask rows throw. |
| GAT-POL-03 | Be deterministic and side-effect free. | Must | Same input, same output. |
| GAT-POL-04 | Order of checks: platform-forbidden, always-ask, unknown, app table, then standing rule; an invalid or expired mandate is ignored, never trusted. | Must | Tests cover each step and mandates for other owners. |
| GAT-POL-05 | Take the most restrictive outcome over several topics; no topics means ask. | Must | `decideAll` tests. |

## Out of scope

- Model calls.

## Traceability

BR-07, NFR-03.
