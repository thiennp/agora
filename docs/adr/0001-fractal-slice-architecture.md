# ADR 0001: Fractal slice architecture

Status: accepted (Oct 27, 2026).

**Decision.** The platform is a modular monolith. Each capability is a slice under `src/features/<slice>/` with a `public-api/` (the only thing other code imports) and an `internal/` (core, application, infrastructure). Slices talk through public APIs or the `DealEvents` hub, never through another slice's `internal/`. Folder boundaries are enforced by eslint.

**Why.** Many agents and people change this repo in parallel; boundaries keep changes local and let a slice be rebuilt or replaced without touching the others.

**Consequences.** Cross-slice work goes through a public API or an event. The entry layer (`src/app/_composition`) is the only place that wires slices together. See ADR 0002 for platform versus apps.
