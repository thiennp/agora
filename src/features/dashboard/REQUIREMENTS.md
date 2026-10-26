# Dashboard — business requirements

Folder: `src/features/dashboard/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Make the platform visible to judges and owners: what is happening, what was learned, what it costs, how private it is.

## Who it serves

Judges; parent owners; platform operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| DSH-01 | Show live activity of the sandbox city and any real users. | Must | Panels update without a page reload. |
| DSH-02 | Label simulated data as simulated. | Must | Every panel shows the label. |
| DSH-03 | Show no private data. | Must | Only coarse, aggregate or redacted data appears. |
| DSH-04 | Be readable in a screen recording. | Should | Text is legible at 1080p. |

## Out of scope

- Admin tooling; moderation queues.

## Traceability

BR-15, BR-16, BR-19.

## Sub-features

- [City map](features/city-map/REQUIREMENTS.md)
- [Cost panel](features/cost-panel/REQUIREMENTS.md)
- [Learning curve](features/learning-curve/REQUIREMENTS.md)
- [Live feed](features/live-feed/REQUIREMENTS.md)
- [Privacy panel](features/privacy-panel/REQUIREMENTS.md)
- [Safety panel](features/safety-panel/REQUIREMENTS.md)
