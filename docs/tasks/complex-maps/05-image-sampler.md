# 05 Image sampler kernel (F1, Batch B)

Spec: M3 "Sampling" paragraph and acceptance 3–4; the \(1/z\) stress cases; Testing Decisions.

Scope: `src/analysis/complexImage.ts` and its tests. Pure TypeScript.

Acceptance:

1. `sampleImage(f, t0, t1, tolerance, view)`: adaptive parameter bisection on midpoint-to-chord distance in board units, with a named minimum and maximum depth. Returns polyline runs split at non-finite values and at out-of-view excursions; no run crosses a gap.
2. \(z^2\) images of \(\operatorname{Re}z=a\) and \(\operatorname{Im}z=b\) lie within the tolerance of the closed-form parabolas over a set of lines; the three M3 sample points and the dot product at \(1+i\) match.
3. Stress tests on \(w=1/z\) for \(\operatorname{Re}z=0.05\) over \(t\in[-100,100]\) and \([-2,2]\) reproduce the spec's deviation bounds (adaptive within \(10^{-3}\) of the circle of centre \(10\), radius \(10\) in the view \([-4,4]^2\)); the point counts are reported, not asserted exactly.
4. The documentation comment states the sampler is a heuristic that can miss features narrower than the minimum-depth spacing.

Checks: `just unit src/analysis/complexImage`, full unit suite once; mutation evidence per group.
