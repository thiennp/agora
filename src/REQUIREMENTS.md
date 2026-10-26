# Source — business requirements

Folder: `src/`  ·  Top level: [REQUIREMENTS.md](../REQUIREMENTS.md)

## Purpose

All application code, organised by Fractal Slice Architecture.

## Who it serves

Developers.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SRC-01 | Follow the slice layout: entry in app, capabilities in features, cross-slice effects in hubs, shared infrastructure in lib, design system in components. | Must | Boundary lint passes. |
| SRC-02 | No slice imports another slice internal folder. | Must | Lint fails the build otherwise. |

## Out of scope

- Code outside these folders.

## Traceability

NFR-02.

## Sub-features

- [Catalog](features/catalog/REQUIREMENTS.md)
- [Dashboard](features/dashboard/REQUIREMENTS.md)
- [Family](features/family/REQUIREMENTS.md)
- [Gatekeeper](features/gatekeeper/REQUIREMENTS.md)
- [Intake](features/intake/REQUIREMENTS.md)
- [Language](features/language/REQUIREMENTS.md)
- [Learning](features/learning/REQUIREMENTS.md)
- [Logistics](features/logistics/REQUIREMENTS.md)
- [Matching](features/matching/REQUIREMENTS.md)
- [Memory](features/memory/REQUIREMENTS.md)
- [Negotiation](features/negotiation/REQUIREMENTS.md)
- [Owner cards](features/owner-cards/REQUIREMENTS.md)
- [Safety](features/safety/REQUIREMENTS.md)
- [Simulation](features/simulation/REQUIREMENTS.md)
- [Trust](features/trust/REQUIREMENTS.md)
- [Voice](features/voice/REQUIREMENTS.md)

## Contents

- [App routes](app/REQUIREMENTS.md)
- [Design system](components/REQUIREMENTS.md)
- [Features](features/REQUIREMENTS.md)
- [Hubs](hubs/REQUIREMENTS.md)
- [Shared infrastructure](lib/REQUIREMENTS.md)
