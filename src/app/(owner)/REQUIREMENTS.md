# Owner pages — business requirements

Folder: `src/app/(owner)/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [App routes](../REQUIREMENTS.md)

## Purpose

Screens for parents.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| APP-OWN-01 | Cards, items and deals pages (built, demo personas; matches show inline on the items page); onboarding and photo intake are not built (no accounts, no Meta key). | Must | Each built page reachable from the main flow. |
| APP-OWN-04 | Shipping is handled in the deal room: the recipient gives the address, only the sender sees the label, postage is a recorded split with no money handled. | Must | `src/app/api/shipping.test.ts`. |
| APP-OWN-02 | The main flow from photo to confirmed deal takes few steps. | Must | Counted in rehearsal. |
| APP-OWN-03 | Pending owner questions are always the most prominent item. | Must | Visible on every owner page. |

## Out of scope

- Admin features.

## Traceability

BR-01 to BR-09.
