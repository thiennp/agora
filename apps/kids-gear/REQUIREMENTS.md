# Kids' gear exchange (example app) — business requirements

Folder: `apps/kids-gear/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)

## Purpose

The first example app on Agora: parents' agents trade outgrown kids' gear. It is configuration plus data only.

## Who it serves

Parent owners; judges evaluating the platform.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| APP-01 | Define the whole app in `app.config.ts` (catalog, policies, theme) validated by the platform schema. | Must | Config parses; invalid config fails with a clear error. |
| APP-02 | Contain no platform logic and import nothing from `src/` except `src/lib/app-config`. | Must | Lint enforced. |
| APP-03 | Ship its own sandbox city and any golden sets it needs. | Must | Simulation runs from this folder only. |
| APP-04 | Keep health advice out: safety rules are advisory logistics only. | Must | No health claims in config text. |

## Out of scope

- Platform capabilities (negotiation, relay, trust, learning).
