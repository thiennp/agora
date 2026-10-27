# Standing rules — business requirements

Folder: `src/features/learning/features/standing-rules/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Learning](../../REQUIREMENTS.md)

## Purpose

Propose rules that reduce interruptions.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LRN-STR-01 | Propose a standing rule after repeated identical low-risk answers. | Should | Proposal appears after a defined count. |
| LRN-STR-02 | Require owner opt-in and apply an expiry. | Must | No rule activates without opt-in. |
| LRN-STR-03 | Never propose rules for always-ask topics. | Must | Test confirms. |
| LRN-STR-04 | The count is three identical yes answers in a row for one topic; a no resets it; a dismissed topic is not proposed again; a topic that already has a rule is skipped; only the owner can accept or dismiss. | Must | Proposal and ownership tests. |

## Out of scope

- Automatic rule creation.

## Traceability

BR-07, BR-13.
