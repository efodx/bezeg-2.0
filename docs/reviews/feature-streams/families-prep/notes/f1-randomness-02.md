# Randomness F1 task 02 handoff (worker)

Status: complete; acceptance 1-5 met. Nothing committed.

Files: src/random/runners.ts, exact.ts, runners.test.ts, exact.test.ts (new only).

- All spec tallies reproduce from seed 42 (RS1 counts, chi2 6.06, max diff 0.0171 / 0.0011; RS2 1/45/493/5011; RS3 76/779/7833; RS4 rms 10.31, mean|S| 8.218, 68 zeros; RS5 71/660/6713; RS6 misses 21 and 28, 524, 0 rejections). Exact: coverage 0.95030/0.95083/0.94999, P(<=2)=0.1208, P(>=10)=0.0272.
- Runner API: `runX(seed, params, n, out, checkpoints?)`, checkpoints = `{at, out}` of the primary tally (Galton: total rights; Frequency: heads; Area: inside; Walks: zeros; Markov: steps in A; Intervals: misses). Walks and intervals return summaries (sumSquares, sumAbs, zeros / misses, rejections).
- Runners are allocation-free: bernoulli/walk compare inline; `below` uses an exact-double Lemire (m <= 2^21); the quarter-disc test uses 16-bit limbs in doubles (`insideQuarterDiscUint32`). Tests prove each equals the sampler loop (draws included) and the limb test equals BigInt on edge values.
- Coverage: integer test (2S-99n)^2*120000 <= 4*196^2*9999*n; `intervalCoverLimit(36)` = 678, i.e. |S-1782|<=339.
- Digest n=1000 seed 42 is asserted (misses=39 of 1000 intervals; not a spec number).
- Mutations observed then restored (diff-checked): skipped draw in Markov B branch -> 4 fail; stationary swapped to (a,b)/(a+b) -> 2 fail; bound 339->340 -> 7 fail.
- exact.ts API: markovStationary returns null for a+b=0; probabilities are doubles 0..1; runners take percents. walkLaw/missCountLaw inherit binomialMasses limits (n 1..1000, p in (0,1)): a 10 000-run miss law is not available.
- Checks: `just unit src/random` pass; `just lint src/random` pass; tsc shows only src/graphs/trig errors.
