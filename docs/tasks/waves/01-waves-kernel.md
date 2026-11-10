# 01 Waves kernel (F1, Batch 0)

Spec: [waves kernel](../../specs/waves-sampling-lessons.md#waves-kernel-owned-by-this-spec) items 1–5; the kernel parts of WV1–WV5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0055 §2–3.

Scope: new `src/waves/sinusoid.ts`, `beats.ts`, `standing.ts` and `sampling.ts`, and their test files. Edit no existing file.

Acceptance:

1. `sumAt` adds the components. `phasorSum` for equal frequencies matches the spec's amplitude and phase formulas and, independently, a sampled maximum of the sum. The WV1 numbers match.
2. `envelope` and the beat frequency \(|f_1-f_2|\), an exact integer. The product identity \(2A\cos(\pi\Delta f\,t)\cos(\pi(f_1+f_2)t)\) matches the direct sum, and the sign flips at the envelope nodes. The WV2 numbers match.
3. The standing-wave identity holds, with nodes at \(n\pi/k\) and antinodes at \((n+\tfrac12)\pi/k\). The WV3 numbers match.
4. `alias(f, fs)` is exact on integers, including `ambiguous` at \(2r=f_s\). It is checked over the whole grid \(f\le40\), \(f_s\le64\) against an independent rule: the frequency in \([0,f_s/2]\) with the same samples, found by brute-force comparison of sample values. `reconstruct` for a single tone has exactly the same samples. For sums, the truncated sinc interpolation reports its error. The WV4 and WV5 numbers match.
5. Out-of-range or non-integer frequencies and rates throw `RangeError`.

Checks: `just unit src/waves`, then `npx tsc --noEmit --pretty false` and `just lint src/waves`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: `2r < fs` changed to `<=` (loses `ambiguous`), the beat frequency halved, and the alias sign dropped.
