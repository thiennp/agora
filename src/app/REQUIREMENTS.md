# App routes — business requirements

Folder: `src/app/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

Next.js entry layer: pages and thin route handlers.

## Who it serves

Parent owners; judges.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| APP-01 | Route handlers only authenticate, validate, call a slice facade and respond. | Must | No business logic in route files. |
| APP-02 | Every page works at phone width. | Must | No horizontal scrolling at 375 px. |
| APP-03 | Every page has empty, loading and error states. | Must | States exist for each page. |

## Out of scope

- Business logic.

## Traceability

NFR-02, NFR-04.

## Contents

- [Judge pages]((judge)/REQUIREMENTS.md)
- [Owner pages]((owner)/REQUIREMENTS.md)
- [API routes](api/REQUIREMENTS.md)
