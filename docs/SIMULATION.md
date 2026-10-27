# Simulation and benchmark

How we measure whether the platform works and whether learning helps. Everything here is **simulated**: synthetic families in a
sandbox city, labelled as such in every output. Nothing is real user data, and the numbers are evidence about the mechanism, not about
real people.

## Run it

```bash
npm run simulate -- --rounds 8 --seeds 5          # app kids-gear, learning on versus off, 5 seeds
```

Writes to `reports/simulation/` (not committed): `summary.csv` and `summary.json` (mean and range over seeds), and for the first seed
`per_round_*.csv`, `comparison_*.csv`, `failures_*.csv`. Every row has `simulated=true`. The whole run takes a few seconds and needs no
network or model key. If the repository is checked out inside a git worktree under `.claude/worktrees`, run it from a plain checkout.

## What a run does

- **City:** the 20 synthetic families in `apps/kids-gear/sandbox-city/` (three languages), placed on a synthetic map so distances exist.
  Some families have free pickup hours, so scheduling questions arise.
- **Simulated owners** decide with **hidden rules** (maximum distance, minimum condition, exact size) generated from persona style and a
  seed. The agents, matcher and learning slice never see them; they can only discover them from declines. A simulated owner always
  answers scheduling questions yes and accepts every standing-rule proposal (opt-in).
- **Episodes** run the real slices end to end with deterministic ids and no live model: catalog, matching, negotiation, gatekeeper,
  owner cards, learning. Each family has a fresh offer and want every episode; the top match is negotiated and both owners decide.
- **Rounds:** in each round the arm is first measured on **held-out episodes** (scenarios no lesson was learned from; they read learned
  limits but never write lessons), then trained on separate training episodes. Round 1 is measured before anything is learned, so both
  arms start equal. The **learning-off** arm never learns and is the baseline.
- **Reproducible:** the same seed gives identical results; each scenario has its own seeded stream. Several seeds are reported as mean
  and range so no single lucky seed decides the story.

## Metrics (held-out only)

Owner approval rate (metric 1), match relevance as precision at 3 against the hidden rules (2), rounds to agreement (3), cross-language
success (4), owner interruptions per deal (9), unauthorized commitments (8, must be 0), plus deal success rate, no-match rate and
**confirmed deals per 100 wants**, which does not reward proposing fewer deals. Failures are kept: counts for all, a sample of each kind
in the report, all of them in the CSV.

## Results (5 seeds, 8 rounds, run Oct 27, 2026)

| Round | Approval, learning on (range) | Approval, learning off (range) | Confirmed per 100 wants, on | off |
|---|---|---|---|---|
| 1 | 0.322 (0.258–0.377) | 0.322 (0.258–0.377) | 12.7 | 12.7 |
| 2 | 0.549 (0.423–0.683) | 0.269 (0.186–0.377) | 11.3 | 8.3 |
| 3 | 0.617 (0.458–0.741) | 0.281 (0.231–0.338) | 10.7 | 9.3 |
| 4 | 0.742 (0.655–0.909) | 0.323 (0.266–0.417) | 15.3 | 12.7 |
| 5 | 0.696 (0.577–0.840) | 0.291 (0.238–0.333) | 13.3 | 9.7 |
| 6 | 0.738 (0.593–0.889) | 0.326 (0.210–0.391) | 15.0 | 12.7 |
| 7 | 0.704 (0.593–0.846) | 0.292 (0.258–0.373) | 13.3 | 11.3 |
| 8 | 0.685 (0.533–0.885) | 0.320 (0.273–0.348) | 13.0 | 12.3 |

What this shows, and what it does not:
- **Approval more than doubles with learning** (about 0.32 to about 0.7) and the ranges separate clearly from round 2.
- **Most of that is precision, not volume.** Learned limits tighten distance, so many wants get no match (no-match rate rises from about
  15% to about 78% for the learning arm). Confirmed deals per 100 wants rise only modestly: the learning arm is ahead by +0.7 to +3.6 in every round
  after the first (smallest in round 8, largest in round 5), and both arms are noisy. Say "learning makes proposals better and fewer", not "learning doubles deals".
- **Interruptions fall**: owner questions per started deal drop from about 0.7 to near 0 once standing rules are accepted.
- **Match precision at 3** rises from about 0.09 to about 0.55, because limits stop far candidates entering the top three.
- **0 unauthorized commitments** in every round and arm.
- **Almost all declines are "too far"**: the synthetic distances and hidden distance limits dominate. Condition and size lessons rarely
  trigger, so the result is mostly evidence for one lesson type.

## Findings that changed the code

- A run showed about 20% of agent-agreed deals dying on "no agreed time": when two owners' free hours only partly overlapped, the
  negotiator re-offered its own whole window. It now counters with the **shared part** of the two windows; those failures disappear.
- Learning can only **tighten** limits, never loosen them (a deliberate safety property). The cost is lost coverage as shown above. A
  future improvement is an owner-approved way to relax a limit, or occasional exploration; it is not built.

## Not measured, and why

- **Cost per deal and model choices** (Spark Open versus Spark API): need live model calls. The run uses template notes, so there is no
  real cost. The harness will run the same city and seeds under any routing once a Meta key exists.
- **Privacy leaks** (metric 5): covered by the screening evals and leak tests, not by this simulation.
- **Real preferences:** hidden rules are a stand-in. Absolute rates mean little; the on-versus-off difference is the signal.
- **Swap-only apps** (garden-tools): the simulation currently needs deals that can be free.
