# Shipping — business requirements

Folder: `src/features/logistics/features/shipping/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Logistics](../../REQUIREMENTS.md)

## Purpose

Label, appointment, fees and tracking for shipped items.

## Who it serves

Sender and recipient owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LOG-SHP-01 | Create a label only after both owners confirmed and the sender approved shipping. | Must | Label guard test. |
| LOG-SHP-02 | Book a pickup or drop-off appointment. | Must | Appointment details shown to the sender. |
| LOG-SHP-03 | Record the agreed fee split as terms; money moves outside the platform. | Must | No money movement in code. |
| LOG-SHP-04 | Show the recipient address only on the label the sender receives. | Must | No other screen shows it. |
| LOG-SHP-05 | Track status through to delivery. | Should | Status updates reach the deal. |
| LOG-SHP-06 | Only the recipient gives the delivery address, only after both owners approved shipping; only the sender creates the label; the label text (with the address) goes to the sender only. | Must | Label and visibility tests. |
| LOG-SHP-07 | The fee split is two whole percents adding to 100 plus a short note, with no amount, currency or payment field; a test scans the logistics code for payment identifiers. | Must | No-money test. |

## Out of scope

- Customs forms; returns handling.

## Traceability

BR-09.
