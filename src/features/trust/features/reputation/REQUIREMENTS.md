# Reputation — business requirements

Folder: `src/features/trust/features/reputation/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Trust](../../REQUIREMENTS.md)

## Purpose

Summarise how trustworthy an agent has been.

## Who it serves

Trust; owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| TRU-REP-01 | Maintain a trust score per agent from outcomes and reports. | Must | Score changes are explainable. |
| TRU-REP-02 | Apply restrictions or bans at defined thresholds. | Should | Thresholds documented. |
| TRU-REP-03 | Show owners a simple indicator, not raw scores. | Should | Indicator has three levels. |
| TRU-REP-04 | Thresholds: start 80; restricted below 50 (cannot start deals); banned below 25 and only after at least 3 negative events (cannot relay); good from 70. Events: completed deal +5, report against -15, strong signals -10, mild signals -3, cancellation beyond two -3. | Must | Reputation tests. |

## Out of scope

- Public leaderboards.

## Traceability

BR-11.
