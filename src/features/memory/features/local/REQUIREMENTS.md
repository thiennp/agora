# Local provider — business requirements

Folder: `src/features/memory/features/local/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Memory](../../REQUIREMENTS.md)

## Purpose

Default provider backed by the platform database.

## Who it serves

Judges; CI.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| MEM-LOC-01 | Implement the interface with the platform database. | Must | Passes the shared contract tests. |
| MEM-LOC-02 | Be the default provider and the one CI uses. | Must | No external dependency needed. |

## Out of scope

- Cross-device sync.

## Traceability

BR-14, NFR-06.
