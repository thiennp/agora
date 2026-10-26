# Automation — business requirements

Folder: `.github/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

CI gates.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| GHA-01 | Block merges on typecheck, lint, boundaries, unit and property tests, contract tests, simulation smoke and secret scan. | Must | Workflow fails on any red gate. |
| GHA-02 | Run eval suites nightly. | Should | Scheduled workflow exists. |

## Out of scope

- Deployment pipelines beyond the hackathon.

## Traceability

NFR-03.
