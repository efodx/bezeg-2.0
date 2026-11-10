# 02 Runners and exact comparators (F1, Batch 0)

Spec: [randomness kernel](../../specs/randomness-simulation-lessons.md#randomness-kernel-owned-by-this-spec) items 3–5; RS1–RS6 checked numbers; Testing Decisions (runners, exact comparators); Correctness Notes. Decisions: ADR 0049 §2–3.

Scope: new `src/random/runners.ts` and `src/random/exact.ts`, and their test files. Reuse `pcg32.ts` and `samplers.ts` (task 01) and `binomialMasses` from `src/analysis/distributions.ts` as they are. Edit no existing file.

Acceptance:

1. `runGalton`, `runFrequency`, `runArea`, `runWalks`, `runMarkov` and `runIntervals` return integer tallies and a checkpoint list for the first \(n\) trials, written into a supplied typed-array buffer. They make no allocation per trial.
2. Every tally the spec quotes is reproduced from its stated seed. The prefix property holds: the run of \(n\) equals the first \(n\) trials of a longer run. Repeated calls give identical output. `simulationDigest` is stable.
3. The exact comparators are checked against independent computations:
   - `markovStationary` by \(\pi P=\pi\) and by 1000 matrix steps;
   - `markovDistribution` by repeated multiplication;
   - `walkLaw` against full enumeration for \(n\le16\);
   - `intervalCoverage` against direct enumeration for a 4-value population and \(n=3\);
   - `missCountLaw` sums to 1.
4. RS6 coverage is the integer test \(|S-1782|\le339\), with no tie case.
5. Statistical assertions use a fixed seed and a tolerance taken from the exact law, such as \(5\sigma\). `chiSquare` is a test helper only.

Checks: `just unit src/random`, then `npx tsc --noEmit --pretty false` and `just lint src/random`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: a runner that skips a draw on one branch (breaks the prefix property or the tallies), the Markov stationary vector swapped to \((a,b)/(a+b)\), and the coverage bound 339 changed to 340. If a spec tally does not reproduce, do not edit the spec; report the value you get.
