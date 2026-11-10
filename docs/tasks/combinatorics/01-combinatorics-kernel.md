# 01 Combinatorics kernel (F1, Batch 0)

Spec: [combinatorics kernel](../../specs/combinatorics-lessons.md#combinatorics-kernel-owned-by-this-spec) items 1–5; the kernel parts of CB1–CB5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0048 §1–2.

Scope: new `src/combinatorics/binomial.ts`, `latticePaths.ts`, `pascal.ts` and `expansion.ts`, and their test files. Tests may import `src/analysis/distributions.ts` as the object under check. Edit no existing file.

Acceptance:

1. `factorial`, `binomial` (multiplicative product with exact division), `variations`, `variationsWithRepetition` and `permutationsWithRepetition` return `bigint`. They reject non-integers, negative input, \(k>n\) and \(n>200\) with `RangeError`. \(0!=1\) and \(\binom n0=\binom nn=1\). They match explicit enumeration for \(n\le7\). The CB2 numbers match.
2. `pascalRow(n)` is built by the addition rule, independently of `binomial`. It equals `binomial(n, k)` for all \(n\le200\). \(\binom{60}{30}=118264581564861424\) is asserted, together with a demonstration that a double recurrence gives \(118264581564861420\).
3. `pathCount(a, b) = binomial(a+b, a)`. `enumeratePaths(a, b)` returns bit masks in lexicographic order. It matches a DFS oracle for \(a+b\le12\) and throws above the exported cap of 12 steps. `pathThrough` counts paths as a product. The CB1 and CB3 numbers match, including Pascal's identity from the last step.
4. `expandBinomial(n)` and `expandShifted(n, c)` for \(|c|\le9\) match repeated polynomial multiplication. The CB4 numbers match. The CB5 row sums are \(2^n\), and the alternating sum is \(0\) for \(n\ge1\) and \(1\) for \(n=0\).
5. The double `binomialPmf` is within a stated relative error of the exact BigInt ratio for \(n\le60\). Report the observed maximum.
6. No count is ever a double.

Checks: `just unit src/combinatorics`, then `npx tsc --noEmit --pretty false` and `just lint src/combinatorics`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: `binomial` computed through doubles, the cap off by one, and the Pascal addition rule shifted by one index.
