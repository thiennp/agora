# ADR 0001 — Fractal Slice Architecture in a modular monolith

Status: accepted (Oct 26, 2026)

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
  A violation fails the build. A structure check for folder shape per level (`structure-validation.config.json`) is planned and
  not built; until then the two-level depth limit is a convention.
- **Deletion test** for every slice: removing it leaves the rest working with less capability (for example, removing
  `logistics` ends deals at "confirmed").

## Consequences
- Parallel work with few file conflicts, and each unit has its own tests.
- More boilerplate per slice than a flat layout; the two-level depth limit keeps it bounded.
- Boundaries make a later extraction (model-heavy workers first, then media, then logistics) mechanical, but nothing is
  extracted today and no performance claim is made for the split.
- The hub is in-process today; a durable queue behind the same interface is a documented next step.
