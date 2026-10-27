# Language — business requirements

Folder: `src/features/language/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Let two parents who share no language make a deal.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LNG-01 | Support three languages chosen after the early quality test. | Must | Round-trip checks meet the threshold in each. |
| LNG-02 | Show owners both the original and the translation. | Must | Both visible. |
| LNG-03 | Flag uncertain translations rather than hide them. | Should | Low-confidence translations are marked. |
| LNG-04 | Language service per app: detect among the app's languages and translate with the Meta client (role translator); identical requests are cached; the same language never calls a model. | Must | Cache and same-language tests. |
| LNG-05 | A translation failure returns a reason (no model, unavailable, invalid output, numbers changed, too long), never invented text; callers show the original and mark the failure. | Must | Failure-path tests. |
| LNG-06 | Gatekeeper and cards use the service: incoming notes are also classified in English (escalation only), notes are shown to each owner in their language with the original kept, and card text is worded in the owner's language. | Must | Cross-slice tests in gatekeeper, negotiation and owner cards. |
| LNG-07 | Not done yet: the early real-model quality test (plan gate G0) and a filled `evals/translation-roundtrip.golden.json`; until then supported languages are the app's choice, not a verified set. | Info | Run when a Meta API key is available. |

## Out of scope

- More than three languages in v1.

## Traceability

BR-05; gate G0.

## Sub-features

- [Detection](features/detection/REQUIREMENTS.md)
- [Translation](features/translation/REQUIREMENTS.md)
