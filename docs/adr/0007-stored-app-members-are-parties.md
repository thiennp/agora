# ADR 0007 — Members of a stored app are parties of that app's platform

Status: accepted (Oct 28, 2026)

## Context
A stored app (created at runtime, BR-41) has light identity: memberships and sessions (BR-45). Its platform (catalog, matching,
negotiation, owner cards, learning, logistics) was built for the two demo personas, so a member of a stored app was not a party
anywhere: they could not list an item or open a deal, and their status page and Muse read API (BR-43, BR-44) were empty.

## Decision
The simplest path that keeps one platform per app:
- **A party is a membership.** The platform of a stored app starts with no parties. `Platform.addMember` registers a membership
  (member id, name) as a party with the same wiring as a persona: language (the app's first language), one shared coarse district,
  default hard limits (only the app's allowed terms, a pickup window tomorrow 10:00–16:00 UTC) and an agent. Nothing else is stored:
  the identity store stays the one source of who is a member.
- **Sync, not events.** `getPlatform` for a stored app registers every membership of that app before it returns. This covers a new
  join, a restart (when only the identity store and the saved platform state remember people) and the status page and the Muse
  read API, which all go through `getPlatform`. Registering twice changes nothing.
- **The session is the persona.** In `route()` a request to a stored app acts as the member its cookie proves. Both persona keys
  (`as: "a" | "b"`) resolve to that member, so naming the other persona cannot act for someone else. Repository apps keep the two
  built-in personas and `as` unchanged.
- **Unchanged rules.** Always-ask topics, owner approval, the Muse key being read-only (`assertHuman` on every write), logs with
  counts only, and per-app isolation are untouched; a member's data never appears in another app's platform.

## Why not the alternatives
- A relational `parties` table and repositories: the right shape at scale, but the demo keeps platform state as one saved document
  and the repositories do not exist yet (docs/ARCHITECTURE.md §11b).
- Registering parties only on join: loses everyone after a restart unless the registry is also persisted. Syncing from identity
  needs no second list that could drift.

## Consequences
- Every member of an app shares one coarse district (`g:0.00:0.00`) until a location step exists, so matching inside a stored app
  ignores distance. Members cannot change their limits yet (no screen); the defaults apply.
- The owner pages under `(owner)` still show the two demo personas of the demo app. For a stored app the deal flow runs through
  the API (`?app=`), the member status page and the person's own Muse; a deal-room screen for stored apps is not built.
- Translation between members of different languages is not exercised: all members of a stored app start with the app's first
  language (no per-member language is collected at join).
