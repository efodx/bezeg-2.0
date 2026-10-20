# 04. Introduce splines through compact joints

**Source spec:** [Batch B](../../specs/lesson-example-improvements.md#batch-b-rational-constructions-and-splines)

**Status:** planned. **Dependencies:** 00. **Lessons:** `spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, `spline-g1-symmetric`.

## Work

- General spline: replace the five-piece opening with two pieces and one clear joint. Select and record exact compact free points for the quadratic \(C^1\) and cubic \(C^2\) constructions. Verify derived points numerically before selecting the view.
- Move the current high-propagation geometry, with derived points around 70 units away, to a later explicitly framed limitations example. Give it a suitable view and explain why the construction can magnify changes.
- Dedicated \(C^1\)/\(C^2\): use the minimum piece count needed to show the midpoint/thirds construction and neighboring derivatives. Keep a later multi-piece scene for locality comparisons.
- Both \(G^1\) variants: explain one joint before propagation/locality. Retain unequal-ratio comparisons; prepare views that keep derived points visible for the chosen ratios. Distinguish tangent direction from derivative magnitude under the actual parameter spacing.
- Update free/derived point counts, indices, labels, formulas, prompts, and calculations. Do not retain point-index instructions that refer to the old geometry.

Entry points: `src/learning/content/splineGuidedLessons.ts`, `src/graphs/curves/spline/`, and the pure spline scheme implementation located by search. Read the applicable spline specification before changing construction inputs.

## Acceptance and checks

- Every scene has recorded free points, derived points, piece count, degree, continuity, parameter spacing, and relevant ratios.
- Numerically verify positional and first/second derivative continuity as applicable, including parameter interval scaling. Check nonzero joint tangents where the lesson claims a common direction.
- Verify the promised local/nonlocal influence by moving named free points and checking affected versus unaffected pieces.
- Introductory scenes fit desktop/projection and 390 px without repeated zooming to find the joint. Labels distinguish free and derived points without concealing the construction.
- Run focused mathematical/content/scene tests, notation tests, typecheck/build, and browser workflows for all five IDs, including ratio edits, Reset, scene navigation, and restore.
- Hand task 05 settled shared spline preparation capabilities; do not concurrently edit its lesson content.
