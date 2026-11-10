# 01 Generator and samplers (F1, Batch 0)

Spec: [randomness kernel](../../specs/randomness-simulation-lessons.md#randomness-kernel-owned-by-this-spec) items 1–2; Testing Decisions (generator, samplers); Correctness Notes. Decisions: ADR 0049 §1–2.

Scope: new `src/random/pcg32.ts` and `src/random/samplers.ts`, their test files, and a `node` benchmark script under `scripts/` (named in the report). Edit no existing file.

Acceptance:

1. `createPcg32(seed)` uses initstate = seed and initseq = 54, with `next()` returning a uint32 and `clone()`. Seed 42 reproduces `a15c02b7 7b47f409 ba1d3330 83d2f293 bfa4784b cbed606e`. A digest of \(10^6\) draws is recorded as a regression value, with its provenance stated. `clone` agrees with sequential draws. Invalid seeds (non-integer, outside \(0\ldots999\,999\)) snap to 42 and return an actionable status.
2. `bernoulli(rng, percent)` uses the threshold `round(p·2³²)` as an integer and is checked against the integer definition. `below(rng, m)` uses Lemire's method with rejection. Over \(10^6\) draws with \(m=100\), each per-value count is within \(5\sigma\) of uniform. The rejection path is exercised with an injected generator. `insideQuarterDisc` equals a `BigInt` reference. `walkStep` returns \(\pm1\). Every sampler reports the draws it consumed.
3. No double appears in any decision. Tests use fixed seeds and are never flaky.
4. The benchmark script measures \(10^6\) draws for the `BigInt` version in `node` and records the time in the note.

Checks: `just unit src/random`, then `npx tsc --noEmit --pretty false` and `just lint src/random`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: the wrong rotation in XSH-RR, rejection removed from `below`, and `<` replaced by `<=` in `bernoulli`. If the `<=` mutation is unobservable on fixed seeds, say why and test it with an injected generator.
