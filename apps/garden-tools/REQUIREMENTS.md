# Garden tools exchange (example app) — business requirements

Folder: `apps/garden-tools/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)

## Purpose

Neighbours in Austin, TX swap garden tools and seeds through their agents. Configuration plus data only.

## Who it serves

Gardeners (English and Spanish speaking).

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| APP-01 | Define the whole app in `app.config.ts` validated by the platform schema. | Must | Config parses. |
| APP-02 | Import nothing from `src/` except `@agora/app-config`. | Must | Lint enforced. |
| APP-03 | Ship a synthetic sandbox city of 20 gardeners. | Must | Files in `sandbox-city/` are marked synthetic. |
| APP-04 | Power tools with missing guards or damaged cords are declined; advice is logistics only. | Must | Safety rule present. |

## Out of scope

- Platform capabilities (negotiation, relay, trust, learning).
