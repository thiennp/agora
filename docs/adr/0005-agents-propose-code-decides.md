# ADR 0005 — Agents propose; a deterministic kernel decides

Status: accepted (Oct 27, 2026)

## Context
Every member has an AI agent that talks to other members' agents. Model output is probabilistic and the text of other
agents and users is attacker-controlled. Rules such as "ask the owner before any commitment" cannot depend on a prompt being
obeyed.

## Decision
- A model may **propose** (a topic, a note, a translation, a similarity score). It never executes a side effect.
- A small set of pure, unit-tested functions **decide**: the gatekeeper (`decide`: auto, ask or forbid), the deal state
  machine (`next(deal, event, time)`), the agent turn (`decideTurn`), and the owner-card flow. These take structured facts
  as input, not free text.
- Model output is accepted only if it parses against a zod schema. A model can only **escalate** (add a risky topic); it
  cannot lower a decision. Unknown topics, classifier uncertainty and unparsable output map to **ask**.
- Counterparty text is wrapped as untrusted data and cannot influence its own score or enter a system prompt.
- Agreement between agents is not commitment: a deal is confirmed only when both owners confirmed (an invariant tested over
  random event sequences).
- An app config cannot relax these rules; the schema refuses configs that try.
- Learning is **tighten-only**. Loosening a learned limit happens only through a card the owner answers (stretch offer).

## Consequences
- The safety properties are testable without a model: exhaustive table tests, property tests and red-team sets in `evals/`
  with a threshold of zero unauthorized commitments.
- Capability is capped by the kernel: an agent cannot "just handle" a new kind of request; it asks until the kernel learns
  the topic. This costs owner attention, which the simulation measures (cards per confirmed deal).
- Language coverage of the deterministic patterns is limited (en, de, es, vi); other languages ask the owner. This is a
  documented limit, not a hidden one.
