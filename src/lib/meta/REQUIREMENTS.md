# Meta model access — business requirements

Folder: `src/lib/meta/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Shared infrastructure](../REQUIREMENTS.md)

## Purpose

One place to call Meta models, route them and measure cost.

## Who it serves

All agents.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LIB-META-01 | Call only Meta models, so every agent is Muse by construction. | Must | No other model provider exists in code. |
| LIB-META-02 | Route each role to a model from a table and allow swapping for benchmarks. | Must | Routing is configuration. |
| LIB-META-03 | Record tokens, cost and latency for every call. | Must | model_calls rows exist for all calls. |
| LIB-META-04 | Validate every model output against a schema. | Must | Invalid output never reaches business logic. |
| LIB-META-05 | Support the Meta API and open-weight models on partner infrastructure. | Must | Adapters for each. |
| LIB-META-06 | Accept images with a prompt (Meta API only; partner hosts refuse them) and offer a SAM 3.1 client that returns boxes. SAM calls are not in the cost meter yet. | Must | Adapter body and SAM client tests with a fake fetch; checked live Oct 28. |

## Out of scope

- Other model vendors.

## Traceability

BR-12, BR-19.
