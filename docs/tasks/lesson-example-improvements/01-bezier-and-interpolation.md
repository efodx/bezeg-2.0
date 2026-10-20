# 01. Simplify Bézier introductions and comparisons

**Source spec:** [Batch A](../../specs/lesson-example-improvements.md#batch-a-make-foundational-constructions-readable)

**Status:** planned. **Dependencies:** 00. **Lessons:** `bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `elevation`.

## Work

- Bézier: evaluate the symmetric cubic candidate in the spec for the opening calculation, then include an asymmetric configuration. Keep endpoints, convex hull, and interior-control-point influence explicit.
- De Casteljau: introduce the specified quadratic at the midpoint, then a cubic; retain the existing quartic later. Compare quarter and three-quarter parameters. Recompute row counts, formulas, observations, and animations for each degree.
- Alternative construction: introduce an asymmetric cubic with two helper quadratics before the quartic case; ensure helper points and the connecting segment remain distinguishable at the demonstrated parameters.
- Affine: prepare an asymmetric curve with a marked point away from the origin. Show translation, quarter-turn, then scaling; identify the actual pivot and check transformed evaluation against evaluation of transformed control points. Reuse existing graph operations.
- Elevation: retain effective starting geometry. Show the original and elevated polygons together using the existing overlay where possible, while showing that sampled curve values and endpoints agree.
- Check the shared Bézier chapter's prose, worked calculations, and activities. Update only passages/scenes made inconsistent by these changes; retain valid chapter-specific examples where independence is explicit.

Entry points: `src/learning/content/guidedLessons.ts`, `expansionGuidedLessons.ts`, `additionalGuidedLessons.ts`, `rationalConstructionGuidedLessons.ts`, the corresponding `src/graphs/curves/bezier/` classes, `src/learning/content/bezierChapter.ts`, and `src/learning/chapter/activities.ts`.

## Acceptance and checks

- Verify the quadratic midpoint rows and result in the spec; verify the candidate cubic midpoint if used. Check non-midpoint evaluations against an independent Bernstein calculation.
- A learner can see the intended construction in the opening view, identify its rows, and follow the simpler-to-richer sequence without misleading degree counts or coincident helper markers.
- Elevation leaves the curve unchanged, and the two control polygons can be compared without confusing their ownership. Affine scenes match the stated transformation/pivot.
- Slovenian/English content and chapter activities match actual geometry. Tests cover changed calculations and deterministic scene preparation; run notation tests, typecheck/build, and affected lesson/chapter browser workflows.
- Record scene inputs, screenshots/viewports, review findings, and any default/preview changes. Use the [shared acceptance requirements](../../specs/lesson-example-improvements.md#acceptance-criteria).
