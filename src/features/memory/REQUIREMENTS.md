# Memory — business requirements

Folder: `src/features/memory/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Keep durable knowledge about families and deals behind one interface, with AgentWitch as an optional background provider.

## Who it serves

Learning; negotiation; platform operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MEM-01 | Expose one MemoryProvider interface for context, lessons and deal outcomes. | Must | No slice calls a provider directly. |
| MEM-02 | Work fully without AgentWitch. | Must | Mock mode runs end to end with only a Meta key. |
| MEM-03 | Keep each family memory isolated. | Must | No cross-family reads in tests. |
| MEM-04 | A memory failure never blocks a deal. | Must | Failures are logged and retried. |

## Out of scope

- Searching other families memories.

## Traceability

BR-14, NFR-05.

## Sub-features

- [AgentWitch provider](features/agentwitch/REQUIREMENTS.md)
- [Local provider](features/local/REQUIREMENTS.md)
