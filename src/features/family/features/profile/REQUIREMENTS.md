# Family profile — business requirements

Folder: `src/features/family/features/profile/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Family](../../REQUIREMENTS.md)

## Purpose

Capture and maintain the few facts about a family that the rest of the platform needs.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FAM-PRO-01 | Profile holds baby age in months, size profile, preferred language and district, all validated. | Must | Invalid or missing fields are rejected with a plain message. |
| FAM-PRO-02 | Derive the district code from what the owner enters, at roughly 5 km granularity. | Must | The stored value cannot be reversed to a street address. |
| FAM-PRO-03 | Keep age in months current as time passes so forecasts stay accurate. | Must | The age shown increases by one month each month without owner action. |
| FAM-PRO-04 | Onboarding finishes in under 60 seconds in the demo. | Should | Timed during rehearsal. |
| FAM-PRO-05 | Profile fields come from the active app's config (`participant.fields`); all are required and no extra fields are accepted. | Must | Missing, extra or wrongly typed fields are rejected for each app. |
| FAM-PRO-06 | Refuse any app field that looks like health, sleep, feeding or diet data. | Must | An app asking for such a field fails at profile creation. |
| FAM-PRO-07 | Refuse a district entry that looks like an address (contains digits). | Must | "12 Oak Street" is rejected. |

## Out of scope

- Birth dates, names of children, photos of children.

## Traceability

BR-01, BR-18.
