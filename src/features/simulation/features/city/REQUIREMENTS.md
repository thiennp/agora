# City — business requirements

Folder: `src/features/simulation/features/city/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Simulation](../../REQUIREMENTS.md)

## Purpose

The synthetic population.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SIM-CTY-01 | Generate personas with language, district, baby age and preferences. | Must | Personas validate against the schema. |
| SIM-CTY-02 | Generate realistic item photos or descriptions for offers and wants. | Should | Fixtures exist. |
| SIM-CTY-03 | The city is built from the app's sandbox files and placed on a synthetic map (grid cells) so distances exist; some families get free pickup hours; scenarios are generated per key and seed, with distinct keys for training and held-out episodes. | Must | City and scenario tests. |

## Out of scope

- Real user data.

## Traceability

BR-16.
