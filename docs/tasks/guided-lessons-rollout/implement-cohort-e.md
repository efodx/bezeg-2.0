# Implement Cohort E Guided lessons

**Source spec:** [Guided lesson content expansion blueprint](../../specs/guided-lessons-content-expansion.md), Cohort E implementation contract

**Subject source:** the owner's master's thesis (Štampar, 2024), §2.4, §3.2, §4, plus Farin for the circle

**Status:** implemented as draft lessons; owner language review pending

## Goal

Add draft Guided lessons for the nine remaining routes: `decasteljau-alternative`, `farin`, `circle`, `spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, `spline-g1-symmetric`, and `spline-parameterization`. Every claim must trace to the thesis or Farin and to the implementation. Once this cohort lands, every active route has a lesson.

## Slices

Slices 1–4 run in parallel and write only `src/` code and unit tests; they run no builds or browser tests. Slices 5–6 follow. Slice 7 runs one build and one full smoke pass.

1. **Spline core**: owns `src/graphs/curves/spline/BaseSplineCurveGraph.tsx`, `CnSplineGraph.tsx`, `C1SplineGraph.tsx`, `C2SplineGraph.tsx`, their tests, and all new `LessonAction` variants in `src/learning/model.ts`. Handle `spline-label-points` and `spline-hide-fixed` in the base, and `spline-continuity`/`spline-degree` on `spline-cn`. Test $C^r$ at junctions for C¹, C², and Cⁿ (several r and degrees) against the curve classes.
2. **G¹ and spline parameterization**: owns `G1SplineGraph.tsx`, `G1SymmetricSplineGraph.tsx`, `src/graphs/curves/parametrisations/SplineAlphaParametrizationGraph.tsx`, and their tests. Handle `spline-beta`, make the β sliders show actual values, and handle `parameterization-alpha`/`parameterization-samples` with curve-owned α reapplied on restore and in the default scene. Test tangent continuity, the derivative ratio $b$, Algoritem 6 junctions, and α knot spacing.
3. **Farin and circle**: owns `src/graphs/curves/rational/FarinPointsCurveGraph.tsx`, `RationalBezierCurveCircleGraphN.tsx`, and their tests. Handle `farin-points`, `standard-form`, `rational-weights`, and `circle-pieces`. Raise the circle minimum to 3 and make its generated pieces restorable. Test the Farin ratios, the standardization (including $1,3,9,27\to1,1,1,1$), unchanged curve points, radius 3 everywhere, and shared tangents.
4. **Alternative De Casteljau**: owns `src/graphs/curves/bezier/DecasteljauGraph2.tsx` and its test. Handle `parameter` `t` without disturbing playback, rebind helper curves after every import, and test Izrek 2.13 at several `t`.
5. **Spline content**: lessons for the six spline routes in a new `src/learning/content/splineGuidedLessons.ts`.
6. **Rational and De Casteljau content**: lessons for `farin`, `circle`, and `decasteljau-alternative` in a new `src/learning/content/rationalConstructionGuidedLessons.ts`.

   Both content slices add scene-action mapping, registration, the allowlist, catalog counts, and math-notation coverage. They cite thesis sections and recompute every number in tests.
7. **Smoke batch**: rows for all nine routes in `tests/guided-lessons.smoke.spec.cjs`, then one build and one full built suite.

## Acceptance criteria

- Blueprint route-level criteria 1–4 and 6 pass for all nine routes; criterion 5 owner language review stays pending, with the thesis recorded as subject source.
- Exit restores exactly the pre-lesson curves, control points, weights, β values, α, continuity/degree, piece count, Farin and standard-form state, and slider/switch displays.
- The circle's minimum piece count change and any preset-data correction are documented with reason and user impact.
- `npx tsc --noEmit --pretty false`, the full Jest suite, the production build, and one full built smoke run pass.
- Capability, rollout-matrix, and roadmap documents record that every active route now has a draft lesson.

## Verification

- `npx tsc --noEmit --pretty false` is clean. Jest passes: 57 suites, 559 tests.
- `npm run build` passes. `npm run test:smoke:built` passes 187/187 with 2 workers in 10.6 min; the lesson spec alone is 153/153. That run includes the nine new rows and an "Observation flow" block covering the observe, back-to-instructions and continue paths, plus playback freezing.
- Follow-up: spline-cn step 3 leaves derived points outside the default view, so its observation prompt now tells the learner to use "Zoom out".
- Not covered by smoke: dragging a Farin slider and checking the weights. The G¹ inspector sliders are labelled "Parameter", with "Parameter b" as the heading above them.
- Open data question for the owner: the three-number default points of `spline-cn` and `spline-c2`.
