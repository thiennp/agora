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
| LOG-06 | A handover plan exists only after the deal is confirmed by both owners (created from the DealConfirmed event); before that the handoff card is empty. | Must | Plan-timing test. |
| LOG-07 | Exact meeting places and delivery addresses are stored encrypted (AES-256-GCM, secret of at least 16 characters, fresh IV per value), decrypted only to show the other owner after agreement or to call the carrier adapter. | Must | Crypto and storage tests. |
| LOG-08 | A deal moves to handoff when both owners approved the way to hand over; delivery or an owner's report ends it as completed or not completed, which also completes or releases both items. | Must | Outcome tests. |
| LOG-09 | Not built yet: owner-card screens for the handoff card, notifications, a real test-mode carrier (LOG-CAR-03), real drop-point lookup, per-app handoff rules beyond the allowed modes. | Info | Tracked in CLAUDE.md status. |

## Out of scope

- Payments, escrow, insurance, customs.

## Traceability

BR-09; roadmap item: paid shipping.

## Sub-features

- [Carriers](features/carriers/REQUIREMENTS.md)
- [Handoff](features/handoff/REQUIREMENTS.md)
- [Shipping](features/shipping/REQUIREMENTS.md)
