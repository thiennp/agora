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
| GAT-CLS-04 | Detect risk topics deterministically (patterns in en, de, es, vi); a model proposal may add a topic that exists in the app table but can never lower the result. | Must | A confident benign proposal with no deterministic match still asks. |
| GAT-CLS-05 | Auto is possible only when a harmless topic is positively recognised and nothing risky is found; greetings count only when the message is a greeting plus at most two words. | Must | Gibberish, empty and long mixed-language text ask. |
| GAT-CLS-06 | Classify both the original text and its English translation before deciding, so a risk worded in an unsupported language is still caught. | Must | Not yet wired: needs the language slice; until then unknown or unsupported text asks. |

## Out of scope

- Sentiment analysis.

## Traceability

BR-07; evals.
