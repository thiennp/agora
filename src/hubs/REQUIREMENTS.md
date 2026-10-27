# Hubs — business requirements

Folder: `src/hubs/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

Cross-slice integration without direct coupling.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| HUB-01 | Hubs import no slice. | Must | Lint enforced. |
| HUB-02 | Producers use commands and consumers use queries or listeners. | Must | No direct cross-slice calls for side effects. |
| HUB-03 | DealEvents carries: DealAgreedByAgents, OwnerQuestionOpened, DealConfirmed, DealDeclined, DealExpired, HandoffProposed, ShipmentUpdated, HandoffFinished, ReportFiled. A listener that throws never blocks the producer. | Must | Bus tests. |

## Out of scope

- Global anonymous event bus.

## Traceability

NFR-02.

## Contents

- [DealEvents hub](DealEvents/REQUIREMENTS.md)
