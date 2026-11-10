# Randomness and simulation (Naključje in simulacija)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/randomness](../tasks/randomness/README.md). Decisions 1–3: [ADR 0049](../adr/0049-randomness-pcg32-integer-decisions-and-prefix-replay.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #4 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); the owner rule "seeded sampling with a fixed, visible seed and replay, the exact distribution always drawn alongside" is settled; the rest are proposals for owner review.
**Source:** the research note's entry 4 (opening lesson, six lessons, engine, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.16 *Verjetnostni račun* (page 22; *empirična verjetnost*, *matematična verjetnost*, *Zaporedje neodvisnih poskusov*, *Normalna porazdelitev*; objective "razume in poveže empirično in matematično verjetnost") and §4.17 *Statistika* (page 23; sampling, population, standard deviation). Simulation, Markov chains and confidence intervals are not named in the extraction (searched `zaupan`, `simulac`, `markov`: none), so RS5 and RS6 are enrichment, not matura core. Level markers (VR) not verified. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

The probability chapter shows exact distributions: the density (`prob-density`), the binomial and its normal approximation (`prob-binomial-normal`), the central limit theorem (`prob-clt`). It never shows chance happening. A learner meets "empirical versus mathematical probability" (§4.16) only as words, and cannot feel that a relative frequency wanders and settles, that a histogram of balls only approximates the binomial, or that a "95 %" interval is a statement about many repeated samples. A plain `Math.random` simulation would teach the wrong lesson as well: it cannot be replayed, differs between visits, and one lucky run reads as proof.

## Solution

Add a Learn chapter **Naključje in simulacija / Randomness and simulation** with six guided activities, each backed by a Demonstration for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary and first-year. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress.

**Owner rules, applied everywhere.** (1) Every random draw comes from a specified integer generator with a **visible seed** (default 42) and a **Replay** action; the same seed and the same count always give the same picture in every browser. (2) The **exact** quantity (binomial histogram, true value, stationary distribution, true coverage) is drawn in the same view as the simulation, never only after it. (3) The prose says one run is an example, not evidence; the comparison over many repetitions is the evidence. Every simulation picture is an **illustration** of the exact curve beside it. The exact curve is the **argument**.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/random/` (below) with oracle tests; ADRs 1–3 accepted; batch-drawing measurement recorded | Kernel tests pass; no learner-visible route needed |
| A | RS1 Galton board vs binomial; RS2 Law of large numbers | Batch 0 done; Controls step 5 gives the seed, Replay and playback controls; passes the batch gate |
| B | RS3 Monte Carlo area and \(\pi\); RS4 Random walk and \(\sqrt n\) | Batch A released |
| C | RS5 Two-state Markov chain; RS6 Confidence intervals that miss | Batch B released |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- Exact distributions `src/analysis/distributions.ts`: `binomialPmf` (130), `binomialMasses` (137), `poissonCdf` (163), `normalCdf` (78), `normalPdf` (70), `BINOMIAL_N_MAX` (14, = 1000). Model precedent with parse/validate/edit and a view, `src/analysis/binomialNormalModel.ts` (`binomialBars`, `barsPolyline` 190). Graphs `BinomialNormalGraph`, `CltGraph` (`src/graphs/functions/`, registered `src/graphs/graphFactories.ts:210`, `:211`); routes `/probability/binomial-normal` and `/probability/clt` (`src/demonstrations.ts:123`, `:124`). Lesson ids `binomial-normal-approximation` (`src/learning/content/probabilityGuidedLessons.ts:230`), `clt-standardized-sum` (397): linked as prerequisites.
- Convolution and sums `src/analysis/convolution.ts` (`GridDensity`, `moments`) serve the continuous CLT lesson; RS6 needs integer convolution, written new (below).
- No PRNG, sampler or simulation code: searched `Math.random`, `mulberry`, `pcg`, `seed` in `src/` (no kernel; `Math.random` is not used by any lesson or graph).
- No Markov code: searched `markov`, `stationary` (none).

New modules (names suggested): `src/random/pcg32.ts` (generator, seed, jump), `src/random/samplers.ts` (integer draws), `src/random/exact.ts` (stationary distribution, exact coverage, exact random-walk laws), `src/random/randomModel.ts` (state parse/validation), graphs `src/graphs/random/SimulationGraph.tsx` (modes `galton`, `frequency`, `area`, `walk`, `markov`, `interval`). Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **The generator.** (a) PCG32 (XSH-RR, 64-bit state, O'Neill 2014); (b) xoshiro128\*\* or mulberry32 (32-bit state, fast `Math.imul`); (c) `Math.random`, rejected by the research note. Proposal: (a), implemented with `BigInt` first. **Oracle:** the published `pcg32-demo` outputs for `srandom(42, 54)`: `a15c02b7 7b47f409 ba1d3330 83d2f293 bfa4784b cbed606e` (reproduced by the author in `node`, see the note). 32-bit state generators lack a recalled published vector. Measured: \(10^6\) draws in 108 ms in `node` with `BigInt`; replace with a two-halves `Math.imul` version only if the browser measurement says so. Before Batch A.
2. **Reproducibility policy: integers decide, doubles only display.** (a) Every random decision is an integer comparison (`draw < threshold`, `(draw·m) >> 32`, `x² + y² < 2⁶⁴` in `BigInt`); doubles appear only in displayed statistics; (b) draw doubles and use `Math.log`, `Math.cos` (Box–Muller), which engines may round differently in the last place, so a replay could differ across browsers. Proposal: (a); no Box–Muller. Normal data are replaced by integer-valued populations (RS6). Probabilities are percentages on a grid, \(\text{threshold}=\operatorname{round}(p\,2^{32})\). Before Batch A.
3. **Draw order, replay and speed.** (a) Trials are processed in order from one stream, so the outcome of the first \(n\) trials is a prefix of the outcome of the first \(n+1\) and the sample is a pure function of (seed, \(n\)); more samples extend, Replay returns to \(n=0\). Most trials consume a fixed number of draws (Galton: rows; walk: steps; \(\pi\): 2); only `below` (RS6) may consume one extra draw, with probability about \(2\cdot10^{-8}\) per call, so trial \(i\) has no fixed stream offset and random access by index is not offered; (b) one PRNG per trial, hashed from (seed, index): random access but another construction to specify; (c) a rejection-free multiply-shift mapping, whose bias of order \(10^{-8}\) would have to be stated. Handler decision, reversible: (a); the prefix property is about trial outcomes, not stream offsets; the graph caches the running tally and recomputes from the seed when the seed or a lower \(n\) is set. Before Batch A.

## Randomness kernel (owned by this spec)

1. **Generator.** `createPcg32(seed): Pcg32` with initstate = seed, initseq = 54 (fixed), `next(): number` (uint32), `clone`. Seeds are integers \(0\ldots 999\,999\) shown to the learner; invalid input snaps to the default 42 with an actionable message.
2. **Integer samplers.** `bernoulli(rng, thresholdPercent)` (`next < round(p·2³²)`, \(p\) a multiple of \(1/100\)); `below(rng, m)` bounded integer (multiply-shift with rejection of the lowest \(2^{32} \bmod m\) values, Lemire 2019); `insideQuarterDisc(rng)` (two draws; `BigInt` test \(x^2+y^2<2^{64}\)); `walkStep(rng)` (\(\pm1\)). Each reports how many draws it consumed.
3. **Batch runners.** `runGalton(seed, rows, p, n)`, `runFrequency`, `runArea`, `runWalks`, `runMarkov`, `runIntervals`: each returns tallies as integers (counts) for the first \(n\) trials, with a checkpoint list so the running curve is reproducible. A runner takes a typed array output buffer (no per-trial allocation).
4. **Exact comparators (independent of the samplers).** `binomialMasses` (existing); `walkLaw(n)` (distribution of the walk position, from the binomial); `markovStationary(a, b)` \(=(b,a)/(a+b)\) and `markovDistribution(a, b, start, n)` by repeated matrix multiplication; `intervalCoverage(populationMax, n, z)` by integer convolution of the discrete uniform pmf (double); `missCountLaw(runs, miss)` \(=\) binomial.
5. **Verification helpers.** `chiSquare(counts, masses)` for the tests (never shown as a verdict to learners); `simulationDigest(seed, n)` string of the tallies, used by snapshot tests and by the "same on every device" check.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node` using the PCG32 above, seed 42, sequence 54 (scripts and outputs are in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-randomness-solids.md`); none is guessed.

### RS1. Galton board against the binomial

- Learning goal: a ball bouncing left or right at each of \(n\) pegs ends in slot \(k\) with probability \(\binom nk 2^{-n}\); the heap of balls approximates the exact bars, closer the more balls fall; the picture is random but the bars are not.
- Prerequisites: counting paths (the binomial row); `binomial-normal-approximation` is the follow-up. Existing graph `prob-binomial-normal` is not modified.
- Default example (*checked*): 10 rows, \(p=1/2\), 1000 balls, seed 42: slot counts \(0,12,38,118,218,229,207,125,42,11,0\); exact expectation \(1.0,\ 9.8,\ 43.9,\ 117.2,\ 205.1,\ 246.1,\ 205.1,\ 117.2,\ 43.9,\ 9.8,\ 1.0\) (\(P(5)=252/1024=0{,}24609\)); the largest bar difference is \(0{,}0171\) (\(\chi^2=6{,}06\) on 10 degrees of freedom, test only). With \(10^5\) balls, same seed, the largest difference is \(0{,}0011\).
- Steps: (1) one ball falls, the path is drawn; predict the slot; (2) ten balls, the heap; (3) the exact bars appear behind the heap (always visible from here, dimmed under the heap); (4) 1000 balls; predict how far the middle bar is from \(0{,}246\); (5) replay with the same seed: identical heap; change the seed: another heap, same bars; (6) change \(p\) in steps of \(5\,\%\): the bars shift, the heap follows; (7) free exploration.
- Graph needs: a peg board for up to 12 rows, falling balls (playback, speed control), a slot histogram with exact bars as outline, counts per slot readout, seed field and Replay, a text status per slot, reduced-motion path that shows the final tally without animation.
- Acceptance:
  1. The counts above are reproduced from seed 42 and are identical on repeated runs; the runner tally equals the sum of the drawn paths (one computation, no second sampler).
  2. Exact bars come from `binomialMasses` and sum to 1 within \(10^{-12}\); the heap is drawn from integer counts.
  3. After Replay the first \(n\) balls are identical to the earlier first \(n\) (prefix property, ADR 3).
  4. Changing \(n\) from 1000 to 100 and back restores the same tally.
  5. Argument or illustration: the heap is an **illustration**; the bars are the **argument**. The prose says that a heap that differs from the bars is expected, and shows how much (step 4).
  6. Reset, Preset, restore, both languages pass.

### RS2. Law of large numbers

- Learning goal: the relative frequency of heads wanders for small \(n\) and settles near \(1/2\) for large \(n\), but the *number* of heads does not even out; the spread of the frequency shrinks like \(1/\sqrt n\); "empirical approaches mathematical probability" (§4.16).
- Default example (*checked*): fair coin, seed 42, heads count \(h\) after \(n\) tosses: \(n=10\): \(h=1\), \(f=0{,}1\); \(n=100\): \(45\), \(0{,}45\); \(n=1000\): \(493\), \(0{,}493\); \(n=10\,000\): \(5011\), \(0{,}5011\). The exact chance of being \(0{,}1\) or more away from \(1/2\) (i.e. \(|h-50|\ge 10\)) is \(0{,}0569\) at \(n=100\) and \(2{,}7\cdot10^{-10}\) at \(n=1000\) (binomial sums).
- Steps: (1) toss 10 coins, the frequency plotted; predict where it ends after 100; (2) run to 100; (3) 1000; the band \(1/2\pm\) the exact 95 % half-width (from the binomial) closes like a funnel (**argument**); (4) the count \(h-n/2\) grows although \(f\) settles (second plot); (5) different seeds overlaid (up to 5 runs in different seeds, labelled with seed); (6) free exploration.
- Acceptance: (1) the table above is reproduced; (2) the funnel is computed from the exact binomial, not from a normal formula, and is labelled so; (3) the funnel at \(n=100\) agrees with `binomialMasses(100, 0.5)` quantiles to the integer; (4) tosses are integer comparisons (ADR 2); (5) the running plot is thinned for display only (every pixel column), the tally is not; (6) status text for the last value; (7) both languages pass. The prose never says the frequency "must" return to \(1/2\): there is no memory.

### RS3. Monte Carlo area and \(\pi\)

- Learning goal: throw random points at the unit square; the share inside the quarter disc estimates \(\pi/4\); the error shrinks like \(1/\sqrt n\) (slowly), and the exact error scale is known.
- Default example (*checked*): seed 42, points counted inside after \(n\) throws: \(n=100\): \(76\), \(\hat\pi=3{,}04\); \(1000\): \(779\), \(3{,}116\); \(10\,000\): \(7833\), \(3{,}1332\). The standard error \(4\sqrt{p(1-p)/n}\) with \(p=\pi/4\) is \(0{,}1642\) at \(n=100\) and \(0{,}0164\) at \(n=10\,000\).
- Steps: (1) the square and the quarter circle; predict the share inside; (2) 100 points; (3) 10 000 points; (4) the error bar (±1 standard error) drawn beside the estimate: from 100 to 10 000 points is 100 times more points and a 10 times smaller error (ten times more points gives about 3,16 times smaller error) (**argument** of the \(\sqrt n\) law via the exact standard error, not of the value of \(\pi\)); (5) replay and other seeds; (6) free exploration (second shape: a circle in a square, estimate \(\pi/4\); never a shape without a known area).
- Acceptance: (1) counts reproduced; (2) inside-test is exact integer arithmetic (\(x^2+y^2<2^{64}\) in `BigInt`), never a floating comparison; (3) the true value \(\pi/4\) is drawn as a line; (4) the prose says Monte Carlo is a poor way to compute \(\pi\); its use is for regions without a formula; (5) both languages pass.

### RS4. Random walk and \(\sqrt n\)

- Learning goal: after \(n\) random \(\pm1\) steps the walker is typically about \(\sqrt n\) away, not \(n\); the exact distribution of the position is a shifted binomial; returning to zero is common.
- Default example (*checked*): 1000 walks of 100 steps, seed 42: root mean square distance \(10{,}31\) (theory \(\sqrt{100}=10\)); mean \(|S|=8{,}218\) (exact \(7{,}9589\), approximately \(\sqrt{2n/\pi}=7{,}9788\)); \(68\) walks end at 0 (exact \(P(S_{100}=0)=\binom{100}{50}2^{-100}=0{,}0796\), i.e. 79,6 of 1000).
- Steps: (1) one walk of 100 steps; predict the end; (2) ten walks overlaid; (3) the funnel \(\pm\sqrt n\); (4) the end positions as a histogram with the exact law (a shifted binomial, from `binomialMasses`) behind; (5) doubling \(n\) multiplies the spread by \(\sqrt2\) (the predicted value is checked against the walk statistics); (6) free exploration.
- Acceptance: (1) numbers reproduced; (2) exact law from `walkLaw`, parity noted (odd \(n\) has no 0); (3) the funnel is drawn from the exact standard deviation \(\sqrt n\); (4) at most 1000 walks of at most 400 steps; (5) argument or illustration: the exact histogram is the **argument**, the walks an **illustration**; (6) both languages pass.

### RS5. Two-state Markov chain

- Learning goal: a chain that keeps moving between two states settles to a share that does not depend on the start; the settling rate is the second eigenvalue; the long-run share of time equals the stationary distribution.
- Default example (*checked*): stay-in-A probability \(1-a=0{,}7\), from B to A \(b=0{,}6\) (A to B \(a=0{,}3\)): stationary \((b,a)/(a+b)=(2/3,\,1/3)\); second eigenvalue \(1-a-b=0{,}1\); starting in A, \(P(\text{A after }n)=2/3+(1/3)(0{,}1)^n=0{,}7,\ 0{,}67,\ 0{,}667,\ 0{,}6667,\ 0{,}66667\) for \(n=1\ldots5\) (matrix recursion agrees). Simulation, seed 42, 10 000 steps from A: share of time in A \(0{,}6713\) (after 100 steps \(0{,}71\), after 1000 \(0{,}66\)).
- Steps: (1) two boxes and arrows with probabilities; predict where the walker spends more time; (2) simulate 100 steps; (3) the exact distribution after \(n\) steps (bars) converges, 5 steps already agree to 5 decimals (**argument**); (4) start in B: same limit; (5) a slider for \(a, b\) in steps of \(0{,}05\): speed changes, limit \(=(b,a)/(a+b)\); (6) edge cases \(a=b=0\) and \(a=b=1\) (no unique limit): the graph states it; (7) free exploration.
- Acceptance: (1) numbers reproduced; (2) the stationary vector is the exact left eigenvector, checked by \(\pi P=\pi\); (3) transition probabilities are percent grid integers, thresholds are integer comparisons; (4) \(a+b=0\) (the identity chain) reports "no unique stationary distribution" and never divides; \(a=b=1\) has the unique stationary distribution \((1/2,1/2)\) but the distribution after \(n\) steps does not converge (eigenvalue \(-1\), period 2), and the graph says so; (5) both languages pass.

### RS6. Confidence intervals that miss about 5 % of the time

- Learning goal: a 95 % interval is a method; repeated on fresh samples it covers the true mean about 95 times in 100, so about 5 intervals miss, and which ones is chance.
- Population (decision): the uniform integers \(0,\ldots,99\) (mean \(49{,}5\), variance \((100^2-1)/12\)), sample size 36, known \(\sigma\), interval \(\bar x\pm 1{,}96\,\sigma/\sqrt{36}\), half-width \(9{,}4296\). Integer draws only (ADR 2).
- Default example (*checked*): exact coverage by convolving the pmf 36 times is \(0{,}95030\), so the exact miss probability is \(0{,}04970\), not \(0{,}05\). Seed 42, 100 intervals: 2 miss (numbers 21 and 28; the sampler is `below` with Lemire rejection: 0 rejections in the 360 000 draws, results identical, verified). Exact: with 100 fresh intervals, \(P(\le 2\text{ miss})=0{,}1208\) and \(P(\ge 10\text{ miss})=0{,}0272\) (binomial, 100, \(0{,}0497\)). Seed 42, 10 000 intervals: 524 miss (5,24 %; exact 4,97 %).
- Steps: (1) one sample, one interval, drawn over the true mean line; (2) 20 intervals, misses in a different colour; predict how many; (3) 100 intervals, count the misses, compare with the exact binomial of the misses (bars; **argument**); (4) 10 000 intervals: the miss share approaches the exact value; (5) change the sample size (\(n\ge16\) only): wider or narrower intervals, miss share nearly unchanged (exact coverage \(0{,}95083\) at 16, \(0{,}95030\) at 36, \(0{,}94999\) at 100; small \(n\) are excluded because \(n=1\) always covers and \(n=2\) gives \(0{,}962\)); (6) free exploration.
- Acceptance: (1) the numbers are reproduced; (2) coverage is computed by integer convolution, not by the normal formula, and is shown; (3) miss status never uses a tolerance: for the integer sum \(S\) of the 36 draws the interval contains the mean iff \(|S-1782|\le 339\) (half-width times 36 is \(339{,}465\); no integer \(S\) is within \(0{,}465\) of the bound, so there is no tie case); (4) the miss count is shown with the exact binomial of misses beside it, `missCountLaw` taking \(1-\)`intervalCoverage`, not \(0{,}05\); (5) the prose does not say "95 % probability the mean is in this interval", but "the method covers in 95 % of repetitions"; (6) both languages pass.

## User Stories

1. As a learner I drop balls on a Galton board and see the heap follow the exact bars, never perfectly.
2. As a learner I reproduce yesterday's run from its seed, and change the seed to see that another run has the same law.
3. As an educator I project a run, ask the class to predict, then replay the same seed so everybody sees the same data.
4. As a learner I see that 100 intervals miss about 5 times, and which ones does not matter.
5. As a learner with reduced motion I read the final tally and its exact comparison without animation.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| Slovenian | English | Where | Reason |
| --- | --- | --- | --- |
| seme (generatorja) | seed | seed field | short and used in Slovenian software texts; no source opened |
| ponovi (z istim semenom) | replay | Replay button | reuses the app's existing playback wording; to check in `sl.ts` |
| Galtonova deska | Galton board | RS1 | standard name; used in Slovenian teaching texts, source not opened |
| relativna frekvenca | relative frequency | RS2 | the standard school term; matches §4.16 "empirična verjetnost" |
| zakon velikih števil | law of large numbers | RS2 | standard |
| slučajni sprehod | random walk | RS4 | standard (FMF *Verjetnost*, source not opened) |
| markovska veriga; stacionarna porazdelitev | Markov chain; stationary distribution | RS5 | standard |
| interval zaupanja | confidence interval | RS6 | standard |
| pokrije; zgreši | covers; misses | RS6 | plain words |

Existing terms reused: *porazdelitev*, *binomska*, *normalna* (probability chapter, `prob_*` keys in `src/localization/sl.ts`, e.g. `prob_clt_title` at 3592). The app already has "naključnih" in the fortune example only (`fortune_example_random`, 3801). No source (FMF page, thesis, textbook) was opened for these terms.

## Implementation Decisions

- Gating (per the stream's [boundary with the Controls stream](../tasks/feature-streams/families-prep.md)). **Ungated now:** this spec; F0 plan and ADRs 1–3; F1 kernels `src/random/` as new pure TypeScript files with oracle tests; the batch-drawing measurement as a `node`/benchmark script. **Waits on Controls step 5:** the seed field, the Replay action and playback/speed controls (F2a), because they are shared controls; this spec plans no edit to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels. Dependency on the Controls stream: a numeric field with validation, a Replay button and a playback control with reduced-motion behaviour.
- Performance: drag-free playback of at most a few hundred drawn balls per frame; batch sizes up to \(10^5\) trials (\(10^4\) intervals of 36 draws is \(3.6\cdot10^5\) draws). Measure per [the performance plan](../performance-plan.md) before choosing between `BigInt` and a two-halves implementation and between SVG and canvas for the heap: tally cost, time to first frame at \(n=10^4\) and \(10^5\), and playback frame time on a phone. The exact bars are computed once per parameter change.
- State: seed, \(n\), mode parameters and the playback position are serialised in the preset; import validates ranges and the generator version tag (so a future generator change cannot silently alter stored runs).
- Breaking changes: none (new routes and presets only).

## Testing Decisions

- Generator: the six reference outputs of ADR 1; a long-stream digest at \(10^6\) draws computed once by the independent reference C implementation (to record in F1); `clone` and jump agree with sequential draws.
- Samplers: `below(rng, m)` over a million draws for \(m=100\): per-value counts within \(5\sigma\) of uniform; rejection path tested with an injected generator; `bernoulli` threshold equals the integer definition; the \(\pi\) test equals a `BigInt` reference.
- Runners: the tallies above (seed 42) as regression values; prefix property (first \(n\) of the stream equals the run of \(n\)); identical output on repeated calls.
- Exact comparators against independent computations: stationary vector by \(\pi P=\pi\) and by 1000 matrix steps; `walkLaw` against full enumeration for \(n\le 16\); `intervalCoverage` against direct enumeration for a 4-value population and \(n=3\); `missCountLaw` sums to 1.
- Statistical tests are deterministic: fixed seed, tolerance chosen from the exact law (e.g. \(5\sigma\)), never flaky.
- Graph: counts agree with the kernel, Reset/Preset/restore, both languages, keyboard and text status, no leaked timers or animation frames on dispose.

### Batch-wide acceptance gate

A batch ships only when: kernel tests pass; every quoted number is reproduced by a test from the stated seed; the exact curve is visible in every simulation view; seed field, Replay and reduced-motion work by keyboard and touch; a 10 000-trial run completes within the budget recorded in the performance measurement; the lesson prose test (`lessonMathNotation.test.ts`) and `npx tsc --noEmit` pass; and a smoke test of the new routes is done.

## Correctness Notes

- The generator is deterministic integer arithmetic; replay is exact. Doubles appear only in displayed statistics; the exact comparators are doubles and labelled computed.
- Discrete decisions (ball right or left, point inside, interval covers, walk ends at 0) are integer comparisons on integer draws with thresholds from percent grids (ADR 2); no tolerance stands in for an exact test. The coverage test of RS6 is the integer test \(|S-1782|\le339\); the double constant \(339{,}465\) is documented and no tie case exists.
- `below(rng, m)` is settled as Lemire's method with rejection (unbiased). Verified by the author: re-running the RS6 computations with it gave 0 rejections in 360 000 draws and identical results to the multiply-shift version (note file).
- Statistics are never presented as proof: every readout is next to the exact value and a statement of how far a run is normally from it.

## Out of Scope

Hypothesis tests, \(t\)-intervals, Bayesian updating, non-uniform continuous sampling (Box–Muller and inverse CDF are excluded by ADR 2), Markov chains with more than two states, pseudorandom number generator quality discussions, cryptographic randomness, learner-visible `Math.random`.

## Further Notes

Not verified: the Slovenian terms (no FMF or textbook source opened); VR markers; browser drawing performance of a 10⁵-ball heap; the `BigInt` speed in browsers other than the author's `node`; how a learner reads the funnel in RS2; the Controls stream's final control names. The sibling probability-statistics spec ([probability-statistics-lessons.md](probability-statistics-lessons.md)) was not read; confirm no overlap with its lessons before F0.
