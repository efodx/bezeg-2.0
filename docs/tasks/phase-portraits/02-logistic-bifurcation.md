# 02 Logistic map and bifurcation raster (F1, Batch 0)

Spec: [kernels](../../specs/phase-portraits-lessons.md#kernels) items 4–5; the kernel parts of PP4–PP5 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0054 §3–4.

Scope: new `src/dynamics/logistic.ts` and `src/dynamics/bifurcation.ts`, and their test files. If `src/recursion/logistic.ts` exists when you start, import its map and do not edit it. Otherwise define the map locally. Edit no existing file.

Acceptance:

1. \(r=R/100\) with integer \(R\in[250,400]\). Others are rejected. The fixed point attracts iff \(100<R<300\), and the 2-cycle exists for \(r>3\) and attracts iff \(300<R\le344\). Both are integer tests, checked against the multiplier formulas \(2-r\) and \(4+2r-r^2\). The cycle values satisfy \(f^2(x)=x\).
2. Period detection iterates 200000 steps from \(x_0=0{,}2\) and finds the smallest \(p\le64\) with \(|f^p(x)-x|<10^{-9}\). The result is labelled computed, or "no period \(\le64\) found". It matches the spec's checked table. At \(r=4\) it does not report a false period 1.
3. The raster has \(W\) columns on \([2{,}5;4]\), with 1000 transient and 300 recorded iterates from \(x_0=0{,}2\), counted into 400 bins. It is deterministic and memoised on \((W,\text{bins})\).
4. A 400-bit orbit, or the spec's stated independent oracle, supports the finite-precision remark in the Correctness Notes.

Checks: `just unit src/dynamics`, then `npx tsc --noEmit --pretty false` and `just lint src/dynamics`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: \(R\le345\) in place of \(R\le344\), \(x_0=0{,}5\) for period detection, and the transient dropped from the raster.
