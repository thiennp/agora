# DealEvents hub — business requirements

Folder: `src/hubs/DealEvents/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Hubs](../REQUIREMENTS.md)

## Purpose

Events that move a deal between slices.

## Who it serves

Negotiation; owner-cards; logistics; learning; memory; trust.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| HUB-DEV-01 | Carry DealAgreedByAgents, OwnerQuestionOpened, DealConfirmed, DealDeclined, ShipmentUpdated and ReportFiled. | Must | Each event has a typed payload. |
| HUB-DEV-02 | Deliver at least once and make handlers idempotent. | Must | Replays do not duplicate effects. |
| HUB-DEV-03 | Keep order per deal. | Must | Out-of-order delivery is rejected. |
| HUB-DEV-04 | Trace every event to its deal. | Should | Events carry the deal id. |

## Out of scope

- Events unrelated to deals.

## Traceability

NFR-01, NFR-02.
