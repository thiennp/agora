# Confirmations — business requirements

Folder: `src/features/owner-cards/features/confirmations/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Owner cards](../../REQUIREMENTS.md)

## Purpose

Final yes or no from each owner.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| OWN-CNF-01 | Each owner confirms or declines with a reason code and optional text. | Must | Reason codes: too_far, wrong_size, condition, price, timing, other. |
| OWN-CNF-02 | A deal is confirmed only when both owners confirm. | Must | Invariant test. |
| OWN-CNF-03 | Handoff details are revealed only after both confirm. | Must | Before confirmation the handoff card is empty. |
| OWN-CNF-04 | Either owner may withdraw before handoff. | Should | Withdrawal cancels the deal and notifies the other side. |

## Out of scope

- Partial or conditional confirmations.

## Traceability

BR-08, BR-13.
