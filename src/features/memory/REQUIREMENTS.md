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
| MEM-05 | Providers share one contract suite (empty start, replace by id, delete, family isolation, copies, erasure). | Must | Contract tests run for local and AgentWitch. |
| MEM-06 | Mirroring to AgentWitch is gated on the family's consent and a project existing for them, because AgentWitch has no delete; reads are always served locally. | Must | No-consent and no-project tests. |
| MEM-07 | Not done yet: the Postgres-backed local provider (the in-memory one matches migration 0009), per-family AgentWitch project creation (needs the private `create_project` change), a retry timer calling `flush()`, and verifying the task-mirroring call against a running bridge. | Info | Tracked in CLAUDE.md status. |

## Out of scope

- Searching other families memories.

## Traceability

BR-14, NFR-05.

## Sub-features

- [AgentWitch provider](features/agentwitch/REQUIREMENTS.md)
- [Local provider](features/local/REQUIREMENTS.md)
