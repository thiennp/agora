# Automation — business requirements

Folder: `.github/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

CI gates.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| GHA-01 | Block merges on typecheck, lint (including import boundaries), and the test suite (unit, property, contract, red-team, evals, simulation). A secret scan is planned, not built. | Must | Workflow fails on any red gate. |
| GHA-02 | Run eval suites nightly. | Should | Scheduled workflow exists. |

## Out of scope

- Deployment pipelines beyond the hackathon.

## Traceability

NFR-03.
