# Mandates — business requirements

Folder: `src/features/owner-cards/features/mandates/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Owner cards](../../REQUIREMENTS.md)

## Purpose

Limits and standing rules set by the owner.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| OWN-MND-01 | Owner sets hard limits (distance, categories, availability). | Must | Limits are enforced in matching and negotiation. |
| OWN-MND-02 | Standing rules exist only for low-risk topics and expire. | Must | Always-ask topics cannot be selected. |
| OWN-MND-03 | Owner can see, edit and revoke every rule in one place. | Must | A single settings screen lists all rules. |
| OWN-MND-04 | Count owner interruptions per deal. | Should | Metric is reported by the benchmark. |
| OWN-MND-05 | A standing rule lasts 30 days by default and at most 90, one per topic (a new one replaces the old), and is mirrored into the gatekeeper so it takes effect and is revoked immediately. | Must | Expiry and revoke tests. |
| OWN-MND-06 | Hard limits (distance, blocked categories, availability, minimum condition, allowed terms) are validated against the active app and feed matching (`limitsOf`) and negotiation (`negotiationMandate`). | Must | Invalid categories, terms or distances are rejected. |

## Out of scope

- Rules that allow auto-confirming deals.

## Traceability

BR-07, BR-13; metric: interruptions per deal.
