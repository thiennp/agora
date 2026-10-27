# AgentWitch provider — business requirements

Folder: `src/features/memory/features/agentwitch/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Memory](../../REQUIREMENTS.md)

## Purpose

Store memory in AgentWitch as a background provider.

## Who it serves

Platform operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MEM-AGW-01 | Use one AgentWitch project per family. | Must | Projects are isolated. |
| MEM-AGW-02 | Write lessons through the knowledge tools and mirror deals as tasks for audit. | Must | Entries appear in the family project. |
| MEM-AGW-03 | Degrade to local memory when AgentWitch is unavailable. | Must | Outage does not stop deals. |
| MEM-AGW-04 | Pass the same contract tests as the local provider. | Must | Contract suite green. |
| MEM-AGW-05 | Lessons are sent as plain text to POST /knowledge/update; deal outcomes are mirrored through the task tool (assumed call shape, unverified). Failures are reported and retried up to 5 times; not-paired (409) and no-access (404) are never retried. | Must | Mirror tests. |

## Out of scope

- Exposing AgentWitch to end users.

## Traceability

BR-14.
