# Consent — business requirements

Folder: `src/features/family/features/consent/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Family](../../REQUIREMENTS.md)

## Purpose

Make sharing a conscious, reversible decision.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FAM-CON-01 | Before the first listing, show what is shared, with whom and for how long. | Must | First-listing flow cannot be completed without acknowledging the notice. |
| FAM-CON-02 | Sharing is opt-in per item and per feature (for example the learning commons). | Must | Defaults are off. |
| FAM-CON-03 | Withdrawing consent removes affected items from the marketplace. | Must | Items disappear from matches within one refresh. |
| FAM-CON-04 | Record every consent decision in the audit log. | Should | Each change has a timestamped audit entry. |

## Out of scope

- Legal terms of service text.

## Traceability

BR-18, NFR-04.
