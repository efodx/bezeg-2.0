# 02 Reciprocal and roots kernel (F1, Batch A)

Spec: M1 acceptance 1–3, M2 (ordering and branch cut) and acceptance 1–3. Decisions: ADR 0029 §3.

Scope: `src/analysis/complexRoots.ts`, small additions in a new `src/analysis/complexReciprocal.ts` (conjugate, reciprocal, division with a typed `undefined` result at \(z=0\), exact \(|z|=1\) in grid units), and their tests. `src/analysis/complex.ts` is reused, not changed.

Acceptance:

1. M1 values match (\(10^{-12}\)): \(1/(1+i)\), \(1/(0.5+0.5i)\), \(1/(0.6+0.8i)=\bar z\), \((2+i)/(1-i)=0.5+1.5i\). \(z=0\) gives `undefined`, never \(\infty\) or NaN. \(1/z=\overline{z/|z|^2}\) over the grid.
2. `nthRoots(w, n)` for \(2\le n\le8\): root \(k=|w|^{1/n}e^{i(\operatorname{Arg}w+2\pi k)/n}\) with `complexArgument`'s principal argument. \(w=8i,n=3\) and \(w=1+i,n=3\) match the spec; each \(z^n=w\) within \(10^{-12}|w|\); sum \(0\), product \((-1)^{n+1}w\).
3. \(w=0\) returns the single root \(0\) with multiplicity \(n\). The ordering across the cut matches the spec for \(w=-8\pm10^{-12}i\), and an exactly negative real grid \(w\) has argument exactly \(\pi\).

Checks: `just unit src/analysis/complexRoots src/analysis/complexReciprocal`, then the full unit suite once. Report an observed failure for each group against a deliberate mutation.
