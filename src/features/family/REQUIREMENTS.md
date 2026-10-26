# Family — business requirements

Folder: `src/features/family/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Know who each family is, with the minimum data needed to match, translate and learn.

## Who it serves

Parent owner; their agent.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FAM-01 | Create a family profile by voice, photo or form with baby age in months, size profile, preferred language and coarse district. | Must | A profile is created from a 20-second voice note in each supported language. |
| FAM-02 | Store location only as a coarse district code until a handoff is confirmed by both owners. | Must | No table outside handoffs holds an exact address; covered by a test. |
| FAM-03 | Let the owner view, edit, export and delete all their family data. | Must | Erasure removes the family and every dependent row within the retention policy. |
| FAM-04 | Require explicit, plain-language consent before anything is shared outside the family. | Must | No item is visible to other families before consent is recorded. |
| FAM-05 | Collect no health, sleep or feeding information. | Must | The schema contains no such fields. |

## Out of scope

- Activity logging, health tracking, or any developmental guidance.
- Accounts at scale and billing.

## Traceability

BR-01, BR-18; metric: 0 address leaks.

## Sub-features

- [Consent](features/consent/REQUIREMENTS.md)
- [Family profile](features/profile/REQUIREMENTS.md)
