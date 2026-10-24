# 05a evidence: weighted and uniform parameterization

Scope: `src/learning/content/parameterizationGuidedLessons.ts` and its test. No graph, localization, model, catalog or smoke-spec edits.

## Graph semantics (verified in code)

- `AlphaParamBezierCurveGraph.generateParamPoints(count)`: `count` markers at `B(phi_alpha(i/(count+1)))`, `i = 1..count`. The slider and `parameterization-samples` give N interior samples; the end points B(0), B(1) are not markers. Alpha 0 or 1 collapses all markers to an endpoint.
- Uniform route (`UniformParamBezierCurveGraph`): same marker count; uniform mode uses `getUniformParamTs`: `ds = s(1)/(N+1)`, `t_k = tk(t_{k-1}, ds, k)`.
- Inversion tolerance (`PhBezierCurve.tk`): one predictor step `t + ds/sigma(t)` and exactly four Newton corrections, no stopping tolerance. Measured on the default PH curve: relative arc error about 1e-8 L at N = 3, about 4e-16 L for N >= 10; worst over N = 1..40 is below 1e-6 L (the figure the lesson states). The test also asserts it is above 1e-10 (approximate, not exact).

## Lesson changes

Weighted (5 steps): same-curve at alpha 1/2, N = 3 (explicit actions) -> alpha 1/4, N = 3 -> alpha 3/4, N = 3 -> alpha 1/4, N = 10 (new `wp-density-ten`) -> alpha 1/4, N = 20. The old standalone rule step was merged into step 1. Prose states interior-only samples and that the control points never change. Exact parameters unchanged: (1/2, 3/4, 9/10) and (1/10, 1/4, 1/2).

Uniform (5 steps), geometry unchanged (default PH curve): weighted alpha 1/2 N = 3 (arcs 5.92, 2.43, 2.43, 5.92 vs L/4 = 4.18) -> same, speed explanation -> uniform N = 3 (arcs 4.18 each; chords 4.18, 3.91, 3.91, 4.18, middle about 6% shorter) -> uniform N = 10 (11 arcs 1.52; chords 1.52 ends, 1.44 middle, about 5% shorter) -> weighted alpha 1/2 N = 10 (arcs 2.81 at ends to 0.69 in the middle, about 4 times). Old claim "largest gap about 4 times the smallest" counted end pieces and the default 10 samples; now qualified. Tolerance and Newton scheme are in the `up-equal-arc` explanation and the edge cases. Chord (straight) versus arc distinction added in both languages.

## Checks (all via `npx vitest run src/learning/content/parameterizationGuidedLessons.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/content/sceneContentAgainstGraphs.test.tsx`: 73 passed; `npx tsc --noEmit --pretty false`: no errors)

- Exact mapped parameters at N = 3 for alpha 1/2, 1/4, 3/4 through `alphaParameterization`, interior check.
- Same locus: samples for alpha 1/4, 1/2, 3/4 with N = 3, 10, 20 (Bezier) and weighted plus uniform samples (PH) lie on the curve (distance from a 4000-segment polyline < 1e-2; polyline spacing about 0.009 on the PH curve, so that is the sampling bound; an off-curve point is at distance > 0.5). No scene overrides the curve.
- Uniform arc increments against independent Simpson integration of `sigma` (not `curve.s`) for N = 1..40, tolerance 1e-6 L.
- Chord and arc figures asserted to two decimals; prose figures present in both languages, each pinned to its own step.

Mutation checks (each fails as intended): chord figure 3.91 -> 3.95 in the step text; uniform N = 10 scene -> 12; alpha 0.25 -> 0.3 in a scene; arc tolerance 1e-6 -> 1e-12; locus check offset in x by 0.05; 9/10 -> 8/10 in the expected parameters. (An earlier chord mutation with a non-unique needle passed, which led to the per-step pinning assertions.)

Not run: browser or Playwright, build. Other workers' files not touched.
