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
- **Nine arms**, on the same city and seeds:
  - `learning_off`: never learns; the baseline.
  - `learning_tighten_only`: learns and applies limits that can only tighten (no way to relax).
  - `learning_on`: also asks the owner before looking beyond a learned limit (stretch cards), only when a want has no match at all.
  - `learning_off_retry` and `learning_on_retry`: after a decline, offer the **next-best match**, up to three deals per want.
  - `learning_ordered`, `learning_ordered_wide`, `learning_ordered_open`: learned limits **order** candidates instead of only excluding
    them. Candidates inside the limits are tried first; candidates beyond a learned limit come last, each behind a stretch card the owner
    must approve. `ordered` uses the product's margin (within 30% on distance, one condition step) and back-off after a no; `wide`
    removes the margin; `open` removes the margin and the back-off, to show the far end of this route.
  - `oracle_ceiling`: not a behaviour but an upper bound that knows every owner's hidden rules and picks, for each want, the
    best-ranked match both owners would accept.
- **Reproducible:** the same seed gives identical results; each scenario has its own seeded stream. Several seeds are reported as mean
  and range so no single lucky seed decides the story.

## Metrics (held-out only)

Owner approval rate (metric 1), match relevance as precision at 3 against the hidden rules (2), rounds to agreement (3), cross-language
success (4), owner questions per deal (9), unauthorized commitments (8, must be 0), **confirmed deals per 100 wants** (success that does
not reward proposing fewer deals) and **owner cards per confirmed deal**, counting every card an owner answers (confirm or decline,
scheduling questions and stretch cards), which is what a deal costs their attention. Failures are
kept: counts for all, a sample of each kind in the report, all of them in the CSV.

## Results

Mean over 5 seeds, held-out episodes only; each round is 60 wants per seed (20 families, 3 episodes). "Learning" is `learning_on`; with
stable preferences it equals `learning_tighten_only`.

### Summary over the rounds after the first (stable) or after the drift (drift)

| | Stable (rounds 2 to 8) | Drift (rounds 6 to 10) |
|---|---|---|
| **Confirmed deals per 100 wants** | | |
| no learning | 13.0 | 22.7 |
| tighten-only | 17.1 | 23.4 |
| learning (with stretch) | 17.1 | 24.5 |
| no learning + retry | 21.6 | 35.1 |
| learning + retry | 20.0 | 23.7 |
| learning + retry, ordered (product margin and back-off) | 20.0 | 23.7 |
| learning + retry, ordered wide (no margin) | 20.1 | 25.2 |
| learning + retry, ordered open (no margin, no back-off) | 20.6 | 28.1 |
| oracle ceiling | 22.5 | 36.3 |
| **Owner cards per confirmed deal** (confirm, scheduling, stretch) | | |
| no learning | 13.4 | 8.6 |
| tighten-only | 3.7 | 2.4 |
| learning | 3.7 | 2.5 |
| no learning + retry | 19.2 | 11.1 |
| learning + retry | 3.6 | 2.5 |
| ordered | 3.6 | 2.5 |
| ordered wide | 3.8 | 2.7 |
| ordered open | 5.0 | 3.3 |
| Share of the gap to the oracle closed by retry alone | 90% | 92% |
| Share of the coverage that learning + retry loses against retry alone, won back by ordering / wide / open | 0% / 3% / 40% | 0% / 13% / 39% |
| Stretch cards shown per 100 wants (learning + retry / ordered / wide / open) | 0.4 / 0.6 / 5.0 / 30.6 | 1.1 / 1.1 / 4.7 / 25.5 |
| Share of those cards the owner approved (open) | about 0% (1 of about 640) | about 4% (14 of about 380) |

### Stable preferences, confirmed deals per 100 wants, by round

| Round | No learning | Learning | No learning + retry | Learning + retry | Ordered open | Oracle ceiling | Approval: no learning | Approval: learning |
|---|---|---|---|---|---|---|---|---|
| 1 | 13.7 | 13.7 | 21.7 | 21.7 | 21.7 | 23.0 | 0.343 | 0.343 |
| 2 | 14.3 | 17.0 | 20.3 | 21.0 | 21.0 | 22.3 | 0.335 | 0.643 |
| 3 | 13.0 | 18.0 | 20.7 | 20.0 | 20.0 | 21.3 | 0.328 | 0.715 |
| 4 | 12.0 | 17.7 | 23.0 | 21.3 | 21.3 | 23.0 | 0.329 | 0.725 |
| 5 | 13.7 | 17.0 | 20.3 | 20.0 | 20.0 | 21.7 | 0.351 | 0.719 |
| 6 | 13.0 | 18.0 | 22.7 | 19.7 | 20.0 | 23.3 | 0.330 | 0.734 |
| 7 | 12.0 | 16.0 | 21.7 | 19.0 | 21.0 | 22.7 | 0.326 | 0.705 |
| 8 | 13.3 | 16.0 | 22.3 | 19.0 | 21.0 | 23.0 | 0.354 | 0.694 |

### Preference drift from round 5, confirmed deals per 100 wants, by round

| Round | No learning | Tighten-only | Learning | No learning + retry | Learning + retry | Ordered open | Oracle ceiling |
|---|---|---|---|---|---|---|---|
| 5 | 25.0 | 23.0 | 23.0 | 35.7 | 24.7 | 27.3 | 36.6 |
| 6 | 25.0 | 23.0 | 24.0 | 34.3 | 23.7 | 25.7 | 36.0 |
| 7 | 24.0 | 23.3 | 24.3 | 35.7 | 23.7 | 27.7 | 36.0 |
| 8 | 22.7 | 24.0 | 25.3 | 35.3 | 23.7 | 28.3 | 37.0 |
| 9 | 21.3 | 23.7 | 25.0 | 35.0 | 24.3 | 30.0 | 36.3 |
| 10 | 20.7 | 23.0 | 23.7 | 35.3 | 23.3 | 29.0 | 36.0 |

## What this shows

- **Retry is the big coverage lever.** Offering the next-best match after a decline closes about 90% of the gap between no learning and
  the oracle ceiling (21.6 against 22.5 deals per 100 wants, stable; 35.1 against 36.3 under drift).
- **Learning is the big attention lever.** It cuts the cards an owner answers per confirmed deal from 13.4 to 3.7 (stable) and from 8.6 to
  2.5 (drift), about 70% fewer, lifts the owner approval rate from about 0.33 to about 0.7, and adds about 4 confirmed deals per 100 wants.
  Retry alone costs owners the most: 19.2 and 11.1 cards per confirmed deal.
- **Learning plus retry is the best trade in a stable world:** 93% of retry alone's confirmed deals at 19% of its cards (3.6 against 19.2).
  Under drift it keeps 68% of the deals (23.7 against 35.1) at 22% of the cards, because learned limits, set before owners loosened, hide
  the farther candidates retry would try.
- **Ordering instead of excluding wins back some of that coverage, but at a poor price.** With the product's margin it finds nothing
  extra to offer and equals learning plus retry. Removing the margin wins back 3% (stable) and 13% (drift) of the lost coverage. Removing
  the back-off as well wins back about 40% in both, but needs about 31 stretch cards per 100 wants (stable) and 25 (drift), of which
  owners approve about 0% and 4%. Counting every card, that extra coverage costs about 50 cards per extra confirmed deal in a stable
  world (+0.6 deals for +31 cards per 100 wants) and about 8 under drift (+4.4 deals for +34 cards), against 2.5 to 3.6 cards per deal on
  average. Asking the owner first does not make the last part of the coverage cheap.
- **So the defaults are in the right place.** The product's stretch margin and back-off cost about one card per 100 wants and keep the
  attention saving; ordering does not change that choice. The remaining coverage is available, at a price, to an owner who wants it: the
  honest design is an **owner setting that trades attention for coverage** ("show me more options", which behaves like retry without
  learned limits), not a default. Not built.
- **Stretch cards help a little:** under drift learning with stretch confirms about 1.1 more deals per 100 wants than tightening alone
  (24.5 against 23.4).
- **0 unauthorized commitments** in every round and arm; **almost all declines are "too far"**, so the result is mostly evidence for one
  lesson type.

## Corrections to what earlier versions of this document said

- **A harness flaw made the first published numbers wrong.** A declined offer was never put back on the matcher's list, although the
  catalog listed it again, so declines consumed offers for everyone else and retrying looked harmful (even in round 1). Fixed, guarded
  by a regression test, and every table regenerated. The same omission when agents failed to agree (no common time) was fixed later; it
  changed no published number.
- **"Tightening alone loses coverage under drift, and stretch cards win back two thirds of it" is retracted.** With the corrected harness
  tighten-only (23.4) is not below no learning (22.7), and stretch cards add about 1.1 over tightening alone. The real coverage cost of
  learned limits shows next to retry.
- **The attention metric counted only confirm or decline cards.** It now counts every card an owner answers, including scheduling
  questions and stretch cards, which raised no-learning arms most (13.4 rather than 8.6 cards per confirmed deal, stable). The earlier
  "about 60% fewer cards with learning" is now about 70%.
- **Sample size:** a round is 60 wants per seed, not 180 as an earlier version said when quoting stretch-card rates.

## Findings that changed the code

- About 20% of agent-agreed deals were dying on "no agreed time" because a counter re-offered the owner's whole window; it now counters
  with the **shared part** of the two windows.
- Owners can be asked to look beyond a learned limit (stretch cards), with a margin and a back-off after a no, because a first version
  without them showed 414 cards over five seeds and rounds 4 to 8, of which owners approved 4.

## Next experiment

Let an owner choose their own point on the attention-versus-coverage curve: a per-owner setting that turns learned limits into pure
ordering for that owner (retry without exclusion), and measure how owners who pick each setting fare. Not built.

## Not measured, and why

- **Cost per deal and model choices** (Spark Open versus Spark API): need live model calls. The run uses template notes, so there is no
  real cost. The harness will run the same city and seeds under any routing once a Meta key exists.
- **Privacy leaks** (metric 5): covered by the screening evals and leak tests, not by this simulation.
- **Real preferences:** hidden rules and the drift are stand-ins. Absolute rates mean little; the differences between arms are the signal.
- **The retry, ordering and stretch lookups outside the simulation.** They are done in the simulation harness. No product workflow does
  any of them yet, and there is no owner-card screen for stretch cards.
- **Swap-only apps** (garden-tools): the simulation currently needs deals that can be free.

## Seeing it

The judge dashboard at `/dashboard` draws these curves from `reports/simulation/<scenario>/summary.csv` and `per_round.csv` (run `npm run simulate`, or open the page and it generates them).
