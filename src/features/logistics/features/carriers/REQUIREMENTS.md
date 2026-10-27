# Carriers — business requirements

Folder: `src/features/logistics/features/carriers/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Logistics](../../REQUIREMENTS.md)

## Purpose

Hide carrier differences behind one interface.

## Who it serves

Shipping.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LOG-CAR-01 | Provide createLabel, bookAppointment and track behind one interface. | Must | Shipping depends only on the interface. |
| LOG-CAR-02 | Ship a simulated carrier that produces watermarked test labels. | Must | Default in all environments. |
| LOG-CAR-03 | Optionally integrate one real carrier in test mode, clearly disclosed. | Could | Test-mode labels carry no cost. |
| LOG-CAR-04 | All implementations pass the same contract tests. | Must | Contract suite runs against each. |
| LOG-CAR-05 | The simulated carrier is deterministic, free, watermarked, and tracks by the clock (booked until the appointment starts, in transit for 48 hours, then delivered). | Must | Simulated carrier tests. |
| LOG-CAR-06 | The contract suite lives beside the port as test-support code and is not exported from the slice's public API. | Must | Production code does not import vitest. |
| LOG-CAR-07 | Not built: a real test-mode carrier (LOG-CAR-03 is Could); the previous empty placeholder was removed rather than faking one. | Info | Tracked in CLAUDE.md status. |

## Out of scope

- Paid live labels.

## Traceability

BR-09, NFR-02.
