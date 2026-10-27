# Benchmark — business requirements

Folder: `src/features/simulation/features/benchmark/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Simulation](../../REQUIREMENTS.md)

## Purpose

Measure what matters.

## Who it serves

Judges; developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SIM-BEN-01 | Compute approval rate by round, relevance, rounds to agreement, cross-language success, interruptions, cost per deal. | Must | Metrics 1 to 9 from the plan are produced. |
| SIM-BEN-02 | Compare learning on versus off and model choices. | Must | Comparison table is produced. |
| SIM-BEN-03 | Export results as CSV and feed the dashboard. | Must | Files and charts are generated. |
| SIM-BEN-05 | The report compares arms per round (approval, confirmed deals per 100 wants including the oracle ceiling) and the seed summary reports mean and range. | Must | Seed summary and CSV tests. |
| SIM-BEN-04 | Report metrics 1, 2, 3, 4, 8 and 9 plus confirmed per 100 wants; keep failures (counts for all, a sample per kind, all in the CSV); every row carries simulated=true. | Must | Metric, report and CSV tests. |

## Out of scope

- Publishing numbers that are not from held-out runs.

## Traceability

BR-16, BR-19.
