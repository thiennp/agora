# Trust — business requirements

Folder: `src/features/trust/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Protect families from scams and misuse.

## Who it serves

Parent owners; platform operator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TRU-01 | Screen relayed messages for contact details, links and payment requests. | Must | Screening decisions are logged. |
| TRU-02 | Detect scam patterns and flag them with an explanation. | Must | Each flag names its signal. |
| TRU-03 | Let owners report a deal; keep an evidence bundle. | Must | Report contains hashes, timestamps and screening flags. |
| TRU-04 | Restrict or ban agents that fall below a trust threshold. | Should | Banned agents cannot start deals. |
| TRU-05 | Export reports in a documented format designed for Meta, without claiming Meta acts on them. | Must | Docs and demo use "designed for", not "reported to". |
| TRU-06 | The facade logs screening decisions by kind, never by text; a reported party can learn only that a report exists, never who filed it; exports use keyed pseudonyms and need a deployment secret of at least 16 characters. | Must | Facade tests. |
| TRU-07 | Not built yet: a report review UI and operator tooling, listing-mismatch signals (needs intake), and persistence (the in-memory stores match migration 0008). | Info | Tracked in CLAUDE.md status. |

## Out of scope

- Identity verification of third-party agents.

## Traceability

BR-11, BR-12.

## Sub-features

- [Reports](features/reports/REQUIREMENTS.md)
- [Reputation](features/reputation/REQUIREMENTS.md)
- [Scam signals](features/scam-signals/REQUIREMENTS.md)
- [Screening](features/screening/REQUIREMENTS.md)
