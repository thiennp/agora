# Simulation — business requirements

Folder: `src/features/simulation/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Prove behaviour at scale and measurably with a clearly disclosed sandbox city.

## Who it serves

Judges; developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SIM-01 | Run about 20 synthetic families in three languages through full deals. | Must | One command runs the whole city. |
| SIM-02 | Make runs reproducible. | Must | Same seed, same results with fixture models. |
| SIM-03 | Report only on held-out scenarios. | Must | Train and held-out sets are separate. |
| SIM-04 | Keep failures in the report. | Must | Failure list is part of the output. |
| SIM-05 | Label everything produced here as simulated. | Must | Labels propagate to the dashboard. |
| SIM-06 | Each episode runs the real slices (catalog, matching, negotiation, gatekeeper, owner cards, learning) with deterministic ids and no live model. | Must | Reproducibility test. |
| SIM-07 | Held-out episodes read learned limits but never write lessons; the learning-off arm never learns; round 1 is measured before anything is learned so both arms start equal. | Must | Held-out and baseline tests. |
| SIM-08 | Several seeds are reported as mean and range per round. | Should | Seed summary test; `npm run simulate`. |
| SIM-09 | Coverage-adjusted success (confirmed deals per 100 wants) is reported next to approval rate, because learning raises approval partly by proposing less. | Must | Metric and report note. |
| SIM-10 | Not measured: cost per deal and model choices (no live model), privacy leaks (covered by screening evals); swap-only apps are not supported yet. Documented in docs/SIMULATION.md. | Info | Report notes. |
| SIM-11 | Four arms run on the same city and seeds: learning off, learning with tighten-only limits, learning with owner-approved relaxation (the product), and an oracle ceiling that knows the hidden rules and is not a real behaviour. | Must | Arm and ceiling tests. |
| SIM-12 | A drift scenario (`--drift N`) makes half the families tolerate twice the distance from round N, to test whether learned limits recover. | Must | Drift test; docs/SIMULATION.md. |
| SIM-13 | Report stretch cards shown, approved and confirmed, and owner questions per deal including cards; stretch cards never appear in arms that do not use them and never exceed a quarter of wants. | Must | Stretch tests. |

## Out of scope

- Load testing at production scale.

## Traceability

BR-16; metrics 1 to 9.

## Sub-features

- [Benchmark](features/benchmark/REQUIREMENTS.md)
- [City](features/city/REQUIREMENTS.md)
- [Simulated owner](features/simulated-owner/REQUIREMENTS.md)
