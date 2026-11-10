# Randomness: PCG32, integer decisions and prefix replay

Accepted on 2026-11-10 (F0 of the [randomness spec](../specs/randomness-simulation-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. PCG32 as the generator

The generator is PCG32 (XSH-RR, 64-bit state, O'Neill 2014). `initseq` is fixed at 54, and the learner sees seeds \(0\ldots999\,999\). The first version uses `BigInt`. The oracle is the published `pcg32-demo` output for `srandom(42, 54)`: `a15c02b7 7b47f409 ba1d3330 83d2f293 bfa4784b cbed606e`. In `node`, \(10^6\) draws take 108 ms. A two-halves `Math.imul` version replaces the `BigInt` version only if the browser measurement asks for it, and it must reproduce the same stream.

Presets store a generator version tag. A future generator change then makes import fail with an actionable error instead of silently altering stored runs.

Alternatives:

- xoshiro128\*\* or mulberry32. These are faster but have 32-bit state and no published test vector that the spec could cite.
- `Math.random`. It cannot be seeded, so replay and "the same on every device" are impossible.

## 2. Integers decide, doubles only display

Every random decision is an integer comparison:

- Bernoulli: `draw < round(p·2³²)`, with \(p\) on a percent grid.
- Bounded integers: Lemire's multiply-shift with rejection, which is unbiased.
- Point in the quarter disc: \(x^2+y^2<2^{64}\) in `BigInt`.
- RS6 coverage: \(|S-1782|\le339\).

Doubles appear only in displayed statistics and in the exact comparators, and they are labelled computed. There is no Box–Muller. Normal data are replaced by integer-valued populations.

Alternatives:

- Drawing doubles and using `Math.log` and `Math.cos`. Engines may round these differently in the last place, so a replay could differ across browsers.

## 3. One stream in trial order, so the sample is a prefix

Trials consume one stream in order. The outcome of the first \(n\) trials is therefore a prefix of the outcome for \(n+1\), and the sample is a pure function of (seed, \(n\)). More samples extend the run. Replay returns to \(n=0\). The graph caches the running tally and recomputes from the seed when the seed changes or a lower \(n\) is set.

`below` may consume one extra draw, with probability about \(2\cdot10^{-8}\) per call. Trial \(i\) therefore has no fixed stream offset, and random access by trial index is not offered.

Alternatives:

- One generator per trial, hashed from (seed, index). This gives random access, but it is a second construction to specify and test.
- A multiply-shift without rejection. Its bias of order \(10^{-8}\) would have to be stated to learners.

## Consequences

- Additive only: new routes and Presets.
- The pure kernel lives in `src/random/`. `src/analysis/distributions.ts` supplies exact binomial masses and is unchanged.
- The seed field, Replay and playback are shared controls, so F2a waits on Controls step 5. The batch-drawing measurement is a `node` script and is ungated.
