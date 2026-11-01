# ADR 0001 — Fractal Slice Architecture in a modular monolith

Status: accepted (Oct 27, 2026)

## Context
Agora has many capabilities (matching, negotiation, gatekeeper, relay, trust, logistics, learning, language, simulation)
that must be built by several people in parallel, tested alone and, where needed, deleted or swapped without breaking the
rest. A hackathon timeline rules out microservices; a single unstructured app would let capabilities tangle.

## Decision
- One deployable (Next.js), one Postgres: a **modular monolith** with boundaries enforced by tooling, not convention.
- Each capability is a **slice** under `src/features/<slug>/`; a slice may nest **sub-features** (two levels at most).
  Every level has `public-api/` (the only door in) and `internal/` (private). Tests sit next to the code.
- A slice imports another slice only through its `public-api`. Cross-slice side effects go through a **hub**
  (`src/hubs/DealEvents`) whose `command` side is for producers and `query` side for consumers; a hub imports no slice.
- `route.ts` files stay thin: validate, call a facade, answer. `src/lib` and `src/components` never import a slice.
- Enforcement: ESLint `no-restricted-imports` rules (no `internal/` imports across slices; platform never imports `apps/`).
  A violation fails the build. A structure check for folder shape per level is planned and
  not built; until then the two-level depth limit is a convention.
- **Deletion test** for every slice: removing it leaves the rest working with less capability (for example, removing
  `logistics` ends deals at "confirmed").

## What "fractal" means here
"Fractal" is the claim that **one unit shape repeats at every level, with the same rules**, so a reader who understands one
level understands them all. Concretely, in this repo:

- **Same shape at each level.** The app, a slice (`src/features/negotiation/`) and a sub-feature
  (`src/features/negotiation/features/deal-state/`) each have a `REQUIREMENTS.md`, a `public-api/` and, where there is private logic, an `internal/`, and
  tests next to the code. A sub-feature has the same layout as the slice that contains it; it can be lifted out and treated as
  a slice (the layout does not depend on the parent).
- **Same import rule at each level.** Outsiders reach a unit only through its `public-api`. The ESLint pattern list covers both
  depths (`**/features/*/internal/**` and `**/features/*/features/*/internal/**`), so the rule is one rule applied at two
  levels, not two rules.
- **Same deletion test at each level.** Removing a slice leaves the app working with less capability; removing a sub-feature
  leaves its slice working with less capability (for example, `negotiation/features/relay` can go and negotiation still runs,
  without the human relay).
- **Parent = facade and orchestration, children = capability.** A slice's `public-api` is what the rest of the app sees; its
  own `internal/` holds only coordination (for example the deal runner). The capability logic lives in the sub-features, which
  a parent may use through their `public-api` and which never import the parent's `internal/`.
- **Same documentation at each level.** Requirements refine top-down: root `REQUIREMENTS.md` → slice → sub-feature, so every
  unit's behaviour is traceable to the requirement it refines.
- **Depth is capped at two levels.** Real recursion would allow any depth; this repo stops at slice → sub-feature. Something
  that would nest a third level becomes a sibling instead (carriers sit beside shipping, not under it). The cap is a convention
  today (see above), and the lint rule would need a third pattern if the cap were ever raised.

Not claimed: the shape is not generated or checked per level yet (the structure check is planned), so "same shape" is kept by
review and by the lint rule on imports, not by tooling on folder layout. `docs/ARCHITECTURE.md` section 3 ("How the fractal
nesting works") shows the full tree and the slice map.

## Consequences
- Parallel work with few file conflicts, and each unit has its own tests.
- More boilerplate per slice than a flat layout; the two-level depth limit keeps it bounded.
- Boundaries make a later extraction (model-heavy workers first, then media, then logistics) mechanical, but nothing is
  extracted today and no performance claim is made for the split.
- The entry layer (`src/app/_composition`) is the only place that wires slices together; see ADR 0002 for platform versus apps.
- The hub is in-process today; a durable queue behind the same interface is a documented next step.
