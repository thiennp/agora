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

## Out of scope

- Load testing at production scale.

## Traceability

BR-16; metrics 1 to 9.

## Sub-features

- [Benchmark](features/benchmark/REQUIREMENTS.md)
- [City](features/city/REQUIREMENTS.md)
- [Simulated owner](features/simulated-owner/REQUIREMENTS.md)
