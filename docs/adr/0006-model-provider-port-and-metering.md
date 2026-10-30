# ADR 0006 — One metered, routed model client behind a provider port

Status: accepted (Oct 27, 2026)

## Context
Agents call Meta models for language and vision, the calls cost money, and the right model differs per job. The platform
must run offline for judges and CI, and must not let a runaway loop spend without limit.

## Decision
- All model calls go through `src/lib/meta` (`createMetaClient`). Nothing else talks to a model.
- Providers sit behind a `ModelAdapter` port (`meta-api`, `baseten`, `mock`); a table-driven **router** maps each
  agent role to a model and provider. Mock mode is fully offline and deterministic.
- Structured calls take a zod schema: output is parsed and validated, with one retry, and never returned if invalid.
- A **cost meter** records every call and enforces a per-participant budget and a global breaker before the call is made.
  Callers fall back to deterministic behaviour when the budget is spent.
- A call record holds **counts only** (role, model, provider, tokens, cost, latency, ok). It never holds prompt or reply
  text. This is covered by a regression test (the reply text was once copied into the record by a spread; fixed and tested).

## Consequences
- Swapping or adding a provider touches one adapter; the benchmark can compare routings on the same seeds.
- Prices in the meter are estimates and one is an unverified placeholder; no cost figure should be quoted before they are
  checked.
- The live Meta endpoint format is unconfirmed, so the adapters are exercised only against a simulated backend.

> Superseded in part (Oct 29): the mock adapter remains only as a test double; there is no app-level mock mode, the app always uses the real Meta Model API (`AGORA_MODE` removed).
