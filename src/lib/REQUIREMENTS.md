# Shared infrastructure — business requirements

Folder: `src/lib/`  ·  Top level: [REQUIREMENTS.md](../../REQUIREMENTS.md)
Parent: [Source](../REQUIREMENTS.md)

## Purpose

Domain-agnostic building blocks.

## Who it serves

All slices.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LIB-01 | Provide database access, queue, crypto, rate limiting, feature flags, audit and environment handling. | Must | Each has a test or contract. |
| LIB-02 | Never import a slice. | Must | Lint enforced. |
| LIB-04 | Apps as data (BR-41): app configs created as data are validated by `schema.ts` before they are stored and again when read; ids are unique (3–40 lowercase letters, digits, dashes), never a repository app's id or a reserved word; at most 200 are stored; the sandbox path cannot leave the app. `loadApp` reads repository apps first, then the registered store. | Must | `src/lib/app-config/app-store.test.ts`. |
| LIB-03 | Enforce per-family model budgets and a global spend breaker. | Must | Budget exhaustion degrades to deterministic mode. |
| LIB-05 | `tracked` state registry: stores register containers; a scope snapshots and restores them in place; no effect outside a scope. | Must | `src/lib/state.test.ts`. |
| LIB-06 | `makeQr` encodes a URL as a QR code (error correction M, four-module quiet zone) with no network call. | Should | `src/lib/qr.test.ts`. |
| LIB-04 | Write structured logs without personal data and an append-only audit log of state changes and owner decisions. | Should | No log line contains an address, name or contact detail; audit entries exist for each state change. |

## Out of scope

- Business rules.

## Traceability

NFR-01, NFR-04, NFR-08.

## Contents

- [Meta model access](meta/REQUIREMENTS.md)
