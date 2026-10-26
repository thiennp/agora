# Topic classifier — business requirements

Folder: `src/features/gatekeeper/features/classifier/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Gatekeeper](../../REQUIREMENTS.md)

## Purpose

Label incoming messages with a topic for the policy.

## Who it serves

Gatekeeper.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| GAT-CLS-01 | Label each message with a topic and a confidence. | Must | Output validated against a schema. |
| GAT-CLS-02 | Never decide actions itself. | Must | The classifier has no side effects. |
| GAT-CLS-03 | Recall on always-ask topics meets the golden-set target. | Must | Evaluation suite passes its threshold. |

## Out of scope

- Sentiment analysis.

## Traceability

BR-07; evals.
