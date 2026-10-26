# Logistics — business requirements

Folder: `src/features/logistics/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Turn a confirmed deal into a completed handover.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LOG-01 | Agents agree a handoff mode: in-person pickup, locker or shop drop, or shipping. | Must | Owners approve the mode before it takes effect. |
| LOG-02 | For shipping, create a label and book an appointment through a carrier adapter. | Must | Label and appointment exist after both confirmations, never before. |
| LOG-03 | Reveal exact location or address only after both owners confirm. | Must | Checked by test. |
| LOG-04 | The platform never takes, holds or moves money. | Must | No payment code exists in the repo. |
| LOG-05 | Record the outcome of every handoff. | Must | completed or not_completed with a reason. |

## Out of scope

- Payments, escrow, insurance, customs.

## Traceability

BR-09; roadmap item: paid shipping.

## Sub-features

- [Carriers](features/carriers/REQUIREMENTS.md)
- [Handoff](features/handoff/REQUIREMENTS.md)
- [Shipping](features/shipping/REQUIREMENTS.md)
