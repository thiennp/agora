# Simulation and benchmark

How we measure whether the platform works and whether learning helps. Everything here is **simulated**: synthetic families in a
sandbox city, labelled as such in every output. Nothing is real user data, and the numbers are evidence about the mechanism, not about
real people.

## Run it

```bash
npm run simulate -- --rounds 8 --seeds 5          # app kids-gear, learning on versus off, 5 seeds
```

Writes to `reports/simulation/` (not committed): `summary.csv` and `summary.json` (mean and range over seeds), and for the first seed
`per_round_*.csv`, `comparison_*.csv`, `failures_*.csv`. Add `--drift 5` to run the preference-drift scenario below. Every row has `simulated=true`. The whole run takes a few seconds and needs no
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
  limits but never write lessons), then trained on separate training episodes. Round 1 is measured before anything is learned, so all
  arms start equal.
- **Four arms:** `learning_off` never learns (baseline). `learning_tighten_only` learns and applies limits that can only tighten (the
  earlier behaviour). `learning_on` is the product: it also asks the owner before looking beyond a learned limit (stretch cards, see
  below). `oracle_ceiling` is not a behaviour but an upper bound: it knows every owner's hidden rules and picks, for each want, the
  best-ranked match both owners would accept.
- **Stable and drift scenarios:** by default owners' hidden rules never change. With `--drift 5`, from round 5 half of the families (by
  seed) tolerate twice the distance, to test whether learned limits can recover when real preferences loosen.
- **Reproducible:** the same seed gives identical results; each scenario has its own seeded stream. Several seeds are reported as mean
  and range so no single lucky seed decides the story.

## Metrics (held-out only)

Owner approval rate (metric 1), match relevance as precision at 3 against the hidden rules (2), rounds to agreement (3), cross-language
success (4), owner interruptions per deal (9), unauthorized commitments (8, must be 0), plus deal success rate, no-match rate and
**confirmed deals per 100 wants**, which does not reward proposing fewer deals. Failures are kept: counts for all, a sample of each kind
in the report, all of them in the CSV.

## Results

Mean over 5 seeds, held-out episodes only. "Cards" are stretch cards shown per seed and round (180 wants). Confirmed deals per 100
wants does not reward proposing fewer deals.

### Stable preferences (8 rounds)

| Round | Approval: learning on (range) | tighten-only | off | Confirmed per 100 wants: on | tighten-only | off | oracle ceiling | Stretch cards shown / approved |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.322 (0.258–0.377) | 0.322 | 0.322 | 12.7 | 12.7 | 12.7 | 23.0 | 0 / 0 |
| 2 | 0.549 (0.423–0.683) | 0.549 | 0.269 | 11.3 | 11.3 | 8.3 | 22.3 | 0.6 / 0 |
| 3 | 0.617 (0.458–0.741) | 0.617 | 0.281 | 10.7 | 10.7 | 9.3 | 21.3 | 0.4 / 0 |
| 4 | 0.742 (0.655–0.909) | 0.742 | 0.323 | 15.3 | 15.3 | 12.7 | 23.0 | 1.2 / 0 |
| 5 | 0.696 (0.577–0.840) | 0.696 | 0.291 | 13.3 | 13.3 | 9.7 | 21.7 | 0 / 0 |
| 6 | 0.738 (0.593–0.889) | 0.738 | 0.326 | 15.0 | 15.0 | 12.7 | 23.3 | 0.6 / 0 |
| 7 | 0.704 (0.593–0.846) | 0.704 | 0.292 | 13.3 | 13.3 | 11.3 | 22.7 | 0.2 / 0 |
| 8 | 0.685 (0.533–0.885) | 0.685 | 0.320 | 13.0 | 13.0 | 12.3 | 23.0 | 0.2 / 0 |

### Preference drift from round 5 (10 rounds; rounds 1 to 4 are as above)

| Round | Approval: on | tighten-only | off | Confirmed per 100 wants: on | tighten-only | off | oracle ceiling | Cards shown / approved / confirmed |
|---|---|---|---|---|---|---|---|---|
| 5 | 0.861 | 0.861 | 0.472 | 20.3 | 20.3 | 22.0 | 36.6 | 0 / 0 / 0 |
| 6 | 0.870 | 0.870 | 0.497 | 21.7 | 20.7 | 24.0 | 36.0 | 0.8 / 0.4 / 0.2 |
| 7 | 0.867 | 0.867 | 0.469 | 21.7 | 20.3 | 22.0 | 36.0 | 0.6 / 0.4 / 0.2 |
| 8 | 0.871 | 0.864 | 0.463 | 21.3 | 20.0 | 21.0 | 37.0 | 0.4 / 0.2 / 0.2 |
| 9 | 0.876 | 0.861 | 0.472 | 22.0 | 20.3 | 22.3 | 36.3 | 0.8 / 0.2 / 0.2 |
| 10 | 0.863 | 0.866 | 0.451 | 20.0 | 19.3 | 20.3 | 36.0 | 0.2 / 0 / 0 |

## What this shows

- **Approval more than doubles with learning** (about 0.32 to about 0.7 with stable preferences) and the ranges separate from round 2.
- **Most of that is precision.** Learned limits tighten distance, so more wants get no match; confirmed deals per 100 wants are ahead of
  the no-learning arm by only +0.7 to +3.6 per round after the first. Say "learning makes proposals better and fewer".
- **Correction to an earlier reading.** The first write-up called the rising no-match rate a "coverage loss". With stable preferences it
  is not: the matches that learned limits remove are ones owners would decline anyway, and confirmed deals per 100 wants never fall
  below the no-learning arm. Coverage is only lost when preferences change.
- **Under drift, tightening alone does lose coverage.** After round 5 the tighten-only arm confirms about 20.1 deals per 100 wants on
  average (rounds 6 to 10), against about 21.9 with no learning, because its limits no longer fit owners who now accept farther deals.
  The learning-on arm, which can ask the owner, averages about 21.3: it **wins back about two thirds of the lost coverage**, keeps
  approval near 0.87 (against about 0.47 without learning), and adds only about 0.01 to 0.05 owner questions per deal.
- **Stretch cards are rare and mostly unneeded when preferences are stable.** A first version without a margin showed 414 cards over
  five seeds and rounds 4 to 8 and owners approved 4 of them (about 1%): almost pure interruption. Cards are now offered only for a
  match just beyond a learned limit (within 30% on distance, one step on condition) and back off for five opportunities after a no; the
  stable run then shows about one card per 180 wants and none approved.
- **The oracle shows the biggest headroom is not in learning.** The ceiling is about 22 to 23 confirmed deals per 100 wants with stable
  preferences (about 36 under drift), against about 13 to 15 for the learning arms. Every arm tries only the single best-ranked match
  and each owner's limits discard others; the ceiling picks, for each want, the best match both owners would accept. The likely levers
  are trying the next candidate after a decline and better ranking; this is a hypothesis, not yet tested.
- **Interruptions fall**: scheduling questions per started deal drop from about 0.7 to near 0 once standing rules are accepted.
- **0 unauthorized commitments** in every round and arm.
- **Almost all declines are "too far"**, so the result is mostly evidence for one lesson type.

## Findings that changed the code

- About 20% of agent-agreed deals were dying on "no agreed time": when two owners' free hours only partly overlapped, the negotiator
  re-offered its own whole window. It now counters with the **shared part** of the two windows.
- Learning could only tighten limits. Under drift that costs coverage, so owners can now be asked to look beyond a learned limit, and a
  confirmed stretch deal counts as evidence that loosens it (see LRN-09 to LRN-11).
- The first stretch cards nagged (about 1% approved). They now need a small margin and back off after a no.

## Not measured, and why

- **Cost per deal and model choices** (Spark Open versus Spark API): need live model calls. The run uses template notes, so there is no
  real cost. The harness will run the same city and seeds under any routing once a Meta key exists.
- **Privacy leaks** (metric 5): covered by the screening evals and leak tests, not by this simulation.
- **Real preferences:** hidden rules and the drift are stand-ins. Absolute rates mean little; the differences between arms are the signal.
- **How the stretch lookup is wired outside the simulation.** The two-step lookup (search with learned limits, then with the owner's own
  limits when nothing is found, and ask before going beyond a learned limit) is done in the simulation harness. No product workflow does
  it yet, and the owner-card screen for stretch cards is not built; learning exposes the offer, answer and link calls.
- **Swap-only apps** (garden-tools): the simulation currently needs deals that can be free.
