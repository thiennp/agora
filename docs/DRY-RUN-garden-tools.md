# Dry run: building "Seed & Spade" from CREATE-AN-APP.md

Done Oct 27, 2026 by following the instructions as the agent. The interview answers were simulated by the author,
not given by a real user. Result: `apps/garden-tools/`, one registry line, checks green (18 tests, lint, typecheck).

## Gaps in the schema (the app could not say what the person wanted)

| # | Gap | Evidence |
|---|---|---|
| S1 | **No region.** The interview asks "which area", but nowhere to store "Austin, TX". | Wrote it only in REQUIREMENTS.md. |
| S2 | **Stages cannot wrap the year.** `from/to` numbers cannot express Nov–Feb, so winter was dropped. | Seasons stop at month 12 / start at 2. |
| S3 | **No way to forbid items.** Pesticides, invasive species, etc. cannot be banned; safety rules only add "requires". | Needed "never list pesticides". |
| S4 | **`choice` fields have no options.** Garden size is a `choice` with nothing to choose. | Config passes but is meaningless. |
| S5 | **No money policy.** Free-only vs paid vs swap-only is not expressible, yet price topics exist. | "Swap seeds for tools" has no home. |
| S6 | **Topic names are free text but the classifier only knows built-ins.** App-added topics may never be assigned. | `size_question` vs a garden topic. |
| S7 | **Agent tone/persona is not configurable**, only colours. | "Friendly" had nowhere to go. |
| S8 | **`cityDir` is not validated** and the sandbox file format is undefined (reference files are empty). | Invented `participants.json` / `personas.json`. |
| S9 | **`handoffModes` has no per-category rule** (e.g. power tools pickup only). | Applied to all categories. |

## Gaps in the instructions

| # | Gap |
|---|---|
| I1 | Nothing says what to do when the person's idea needs something the schema cannot express (S1–S9): ask? approximate? report? |
| I2 | No sandbox-city format, so every agent will invent a different one. |
| I3 | Interview does not say how to pick the question language before the person's language is known. |
| I4 | No instruction to keep the app `id` and folder name a slug, or to avoid clashing with an existing app. |
| I5 | Nothing about verifying the app visibly (the platform has no app UI yet, so `/api/health` shows nothing app-specific). |
| I6 | No stop rule for a person who keeps changing the idea, and no "save and resume" for long interviews. |

## Suggested order of fixes

1. Schema: add `region`, `policies.pricing`, `policies.forbiddenItems`, wrap-around stages (S1, S5, S3, S2).
2. Schema: validate `choice` options and `cityDir`; define the sandbox file format with a zod schema (S4, S8).
3. Instructions: add a "when the schema cannot express it" rule and the sandbox format (I1, I2).
4. Later: per-app persona, per-category handoff, classifier topics (S7, S9, S6).
