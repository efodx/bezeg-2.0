# 05. Make sample comparisons easy to read

**Source spec:** [Batch C](../../specs/lesson-example-improvements.md#batch-c-parameterization-and-example-sequences)

**Status:** implemented; accepted 2026-10-25 (task 09, [acceptance](../../reviews/lesson-example-improvements/acceptance.md)). **Dependencies:** 00, 04; coordinate PH defaults with 02.

**Lessons:** `weighted-parameterization`, `uniform-parameterization`, `spline-parameterization`.

## Work

- Weighted parameterization: start with three interior samples. Compare \(\alpha=1/2,1/4,3/4\) with identical control points, then increase the sample count to show density. Preserve the existing exact parameter calculations where valid.
- Uniform parameterization: initially keep the existing PH geometry. Compare weighted and uniform modes at the same count and geometry; show that equal arc-length spacing differs from equal chord length. Record the actual numerical tolerance used by arc-length inversion.
- Spline parameterization: select an open scene with distinctly unequal edge lengths and little label overlap. Start with ten samples and visible joints. Compare \(\alpha=0,1/2,1\) and explain that this construction may change the spline's shape as well as sample positions.
- Keep counts, sample endpoint inclusion, control values, and descriptions accurate after scene actions and mode switches. Do not conflate this spline construction with reparameterizing one fixed Bézier locus.

Entry points: `src/learning/content/parameterizationGuidedLessons.ts`, the spline-parameterization section of `splineGuidedLessons.ts`, `src/graphs/curves/parametrisations/`, and the pure parameterization/arc-length functions located by search.

## Acceptance and checks

- For three samples, check the exact mapped parameters: at \(\alpha=1/4\), \((1/2,3/4,9/10)\); at \(\alpha=3/4\), \((1/10,1/4,1/2)\).
- Verify fixed-locus behavior for weighted/uniform sampling and applicable shape changes for spline parameterization. Check uniform arc-length increments against independently integrated speed within a justified tolerance.
- Samples, joints, and control points are visually distinguishable at both viewports and in both languages. Count changes and mode switches leave no stale markers.
- Run focused numerical/content/scene tests, notation tests, typecheck/build, and affected lesson browser workflows, including indirect state changes and restore.
