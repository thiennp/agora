# Simulation and benchmark

How we measure whether the platform works and whether learning helps. Everything here is **simulated**: synthetic families in a
sandbox city, labelled as such in every output. Nothing is real user data, and the numbers are evidence about the mechanism, not about
real people.

## Run it

```bash
npm run simulate -- --rounds 8 --seeds 5               # app kids-gear, stable preferences
npm run simulate -- --rounds 10 --seeds 5 --drift 5    # from round 5, half the families tolerate twice the distance
```

Writes to `reports/simulation/` (not committed): `summary.csv`, `summary.json` and `headroom.json` (mean and range over seeds), and for
the first seed `per_round_*.csv`, `comparison_*.csv`, `failures_*.csv`. Every row has `simulated=true`. A run takes a few seconds and needs
no network or model key. If the repository is checked out inside a git worktree under `.claude/worktrees`, run it from a plain checkout.

## What a run does

- **City:** the 20 synthetic families in `apps/kids-gear/sandbox-city/` (three languages), placed on a synthetic map so distances exist.
  Some families have free pickup hours, so scheduling questions arise.
- **Simulated owners** decide with **hidden rules** (maximum distance, minimum condition, exact size) generated from persona style and a
  seed. The agents, matcher and learning slice never see them; they can only discover them from declines. A simulated owner always
  answers scheduling questions yes, judges a stretch card from the facts it shows, and accepts every standing-rule proposal (opt-in).
- **Episodes** run the real slices end to end with deterministic ids and no live model: catalog, matching, negotiation, gatekeeper,
  owner cards, learning. Each family has a fresh offer and want every episode; the top match is negotiated and both owners decide. A
  declined deal frees both items, so the offer goes back on the list for the next family, as the catalog does.
- **Rounds:** in each round the arm is first measured on **held-out episodes** (scenarios no lesson was learned from; they read learned
  limits but never write lessons), then trained on separate training episodes. Round 1 is measured before anything is learned.
- **Six arms**, on the same city and seeds:
  - `learning_off`: never learns; the baseline.
  - `learning_tighten_only`: learns and applies limits that can only tighten (no way to relax).
  - `learning_on`: the product so far: also asks the owner before looking beyond a learned limit (stretch cards).
  - `learning_off_retry` and `learning_on_retry`: after a decline, offer the **next-best match**, up to three in all.
  - `oracle_ceiling`: not a behaviour but an upper bound that knows every owner's hidden rules and picks, for each want, the
    best-ranked match both owners would accept.
- **Reproducible:** the same seed gives identical results; each scenario has its own seeded stream. Several seeds are reported as mean
  and range so no single lucky seed decides the story.

## Metrics (held-out only)

Owner approval rate (metric 1), match relevance as precision at 3 against the hidden rules (2), rounds to agreement (3), cross-language
success (4), owner questions per deal (9), unauthorized commitments (8, must be 0), **confirmed deals per 100 wants** (success that does
not reward proposing fewer deals) and **owner cards answered per confirmed deal** (what a deal costs owners' attention). Failures are
kept: counts for all, a sample of each kind in the report, all of them in the CSV.

## Results

Mean over 5 seeds, held-out episodes only. "Learning" is `learning_on`; with stable preferences it equals `learning_tighten_only`.

### Stable preferences, confirmed deals per 100 wants (8 rounds)

| Round | No learning | Learning | No learning + retry | Learning + retry | Oracle ceiling | Approval: no learning | Approval: learning |
|---|---|---|---|---|---|---|---|
| 1 | 13.7 | 13.7 | 21.7 | 21.7 | 23.0 | 0.343 | 0.343 |
| 2 | 14.3 | 17.0 | 20.3 | 21.0 | 22.3 | 0.335 | 0.643 |
| 3 | 13.0 | 18.0 | 20.7 | 20.0 | 21.3 | 0.328 | 0.715 |
| 4 | 12.0 | 17.7 | 23.0 | 21.3 | 23.0 | 0.329 | 0.725 |
| 5 | 13.7 | 17.0 | 20.3 | 20.0 | 21.7 | 0.351 | 0.719 |
| 6 | 13.0 | 18.0 | 22.7 | 19.7 | 23.3 | 0.330 | 0.734 |
| 7 | 12.0 | 16.0 | 21.7 | 19.0 | 22.7 | 0.326 | 0.705 |
| 8 | 13.3 | 16.0 | 22.3 | 19.0 | 23.0 | 0.354 | 0.694 |

### Preference drift from round 5 (rounds 5 to 10; rounds 1 to 4 are as above)

| Round | No learning | Tighten-only | Learning (with stretch) | No learning + retry | Learning + retry | Oracle ceiling | Stretch cards shown / approved / confirmed |
|---|---|---|---|---|---|---|---|
| 5 | 25.0 | 23.0 | 23.0 | 35.7 | 24.7 | 36.6 | 0 / 0 / 0 |
| 6 | 25.0 | 23.0 | 24.0 | 34.3 | 23.7 | 36.0 | 0.6 / 0.2 / 0 |
| 7 | 24.0 | 23.3 | 24.3 | 35.7 | 23.7 | 36.0 | 0.4 / 0.2 / 0 |
| 8 | 22.7 | 24.0 | 25.3 | 35.3 | 23.7 | 37.0 | 0.4 / 0.2 / 0.2 |
| 9 | 21.3 | 23.7 | 25.0 | 35.0 | 24.3 | 36.3 | 0.4 / 0 / 0 |
| 10 | 20.7 | 23.0 | 23.7 | 35.3 | 23.3 | 36.0 | 0.4 / 0 / 0 |

### Summary over the rounds after the first (stable) or after the drift (drift)

| | Stable (rounds 2 to 8) | Drift (rounds 6 to 10) |
|---|---|---|
| Confirmed per 100 wants: no learning | 13.0 | 22.7 |
| tighten-only | 17.1 | 23.4 |
| learning (with stretch) | 17.1 | 24.5 |
| no learning + retry | 21.6 | 35.1 |
| learning + retry | 20.0 | 23.7 |
| oracle ceiling | 22.5 | 36.3 |
| Owner cards answered per confirmed deal: no learning | 8.6 | 5.6 |
| learning | 3.5 | 2.4 |
| no learning + retry | 11.9 | 7.1 |
| learning + retry | 3.5 | 2.4 |
| Share of the gap to the oracle closed by retry alone | 90% | 92% |
| Share of the gap closed by retry on top of learning | 54% | −6% |

## What this shows

- **The headroom hypothesis holds, strongly.** Offering the next-best match after a decline closes about 90% of the gap between no
  learning and the oracle ceiling, with stable preferences and with drift. Retry alone reaches 21.6 confirmed deals per 100 wants against a
  ceiling of 22.5. Trying more candidates, not learning, is what recovers the missing deals.
- **But retry spends owners' attention.** Retry alone answers 11.9 cards per confirmed deal, against 8.6 without it (in round 1, before
  anything is learned, 2.6 cards per want against 1.1). Owners are shown many matches they decline.
- **Learning is about owner attention and approval, not coverage.** Learning cuts cards answered per confirmed deal from 8.6 to 3.5
  (about 60% fewer), lifts the owner approval rate from about 0.33 to about 0.7, and adds about 4 confirmed deals per 100 wants (13.0 to 17.1).
- **The two together are the best trade in a stable world**: learning plus retry confirms 20.0 per 100 wants (93% of retry alone) with 3.5
  cards per confirmed deal, about 30% of retry alone's 11.9.
- **Under drift, learned limits block retry's gains.** Learning plus retry confirms only 23.7 against 35.1 for retry alone, because
  learned limits (set before owners loosened) hide the farther candidates retry would try. Retry on top of learning closes none of the gap.
  The owner-approved stretch card does not help here: it fires only when a want has no match at all, never inside a retry.
- **Stretch cards help a little.** Under drift, learning with stretch confirms about 1.1 more deals per 100 wants than tightening alone
  (24.5 against 23.4; at most 0.6 cards per 180 wants). With stable preferences they are rare and none are approved.
- **0 unauthorized commitments** in every round and arm; **almost all declines are "too far"**, so the result is mostly evidence for one
  lesson type.

## Corrections to what an earlier version of this document said

- **A harness flaw made earlier numbers wrong.** A declined offer was never put back on the matcher's list, although the catalog listed it
  again, so declines consumed offers for everyone else and retrying looked harmful (even in round 1). Found when "retry alone" appeared to
  do worse than no retry; fixed, a regression test now guards it, and every table here was regenerated.
- **"Tightening alone loses coverage under drift, and stretch cards win back two thirds of it" is retracted.** With the corrected harness,
  tighten-only (23.4) is not below no learning (22.7) under drift, and stretch cards add about 1.1 over tightening alone. The real
  coverage cost of learned limits appears next to retry (above), not next to a single attempt.
- **"Learning adds +0.7 to +3.6 confirmed deals per 100 wants" is replaced** by about +4 (13.0 to 17.1).

## Findings that changed the code

- About 20% of agent-agreed deals were dying on "no agreed time" because a counter re-offered the owner's whole window; it now counters
  with the **shared part** of the two windows.
- Owners can be asked to look beyond a learned limit (stretch cards), with a margin and a back-off after a no, because a first version
  without them showed 414 cards over five seeds and rounds 4 to 8, of which owners approved 4.

## Next experiment

Learned limits should **order** candidates instead of excluding them: try the nearest, best-fitting matches first and the ones beyond a
learned limit last (behind a stretch card), so retry keeps its coverage while learning keeps most of its attention saving. Not built.

## Not measured, and why

- **Cost per deal and model choices** (Spark Open versus Spark API): need live model calls. The run uses template notes, so there is no
  real cost. The harness will run the same city and seeds under any routing once a Meta key exists.
- **Privacy leaks** (metric 5): covered by the screening evals and leak tests, not by this simulation.
- **Real preferences:** hidden rules and the drift are stand-ins. Absolute rates mean little; the differences between arms are the signal.
- **The retry and stretch lookups outside the simulation.** Offering the next-best match, and the two-step stretch lookup, are done in the
  simulation harness. No product workflow does either yet, and there is no owner-card screen for stretch cards.
- **Swap-only apps** (garden-tools): the simulation currently needs deals that can be free.
