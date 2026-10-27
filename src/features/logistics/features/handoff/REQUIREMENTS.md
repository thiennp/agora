# Handoff — business requirements

Folder: `src/features/logistics/features/handoff/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Logistics](../../REQUIREMENTS.md)

## Purpose

Choose and run the handover mode.

## Who it serves

Parent owners.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LOG-HND-01 | Propose pickup, locker or shipping from both sides constraints. | Must | Proposal respects distance and availability. |
| LOG-HND-02 | Prefer lockers or shops so home addresses stay hidden. | Should | Locker mode is offered first where available. |
| LOG-HND-03 | Show a short safety checklist with the handoff. | Must | Checklist is displayed on the handoff card. |
| LOG-HND-04 | Capture whether the handoff happened. | Must | Either owner can mark outcome. |
| LOG-HND-05 | Mode order is locker, shop, pickup, shipping; in-person modes need both owners within their distance limits (an unknown distance never satisfies one) and a shared free window; shipping needs only to be allowed. | Must | Pure `proposeMode` tests. |
| LOG-HND-06 | Either owner can propose another allowed mode; that clears approvals; at most 3 changes; a mode the app or either owner does not allow is refused. | Must | Mode-change tests. |
| LOG-HND-07 | Only the owner giving the item writes the exact meeting place; it is shown to the other owner only after both approved the way to hand over. | Must | Reveal-gating test. |

## Out of scope

- Route planning.

## Traceability

BR-09, BR-10.
