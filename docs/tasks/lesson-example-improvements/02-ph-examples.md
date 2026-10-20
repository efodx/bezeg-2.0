# 02. Replace awkward PH arithmetic with simple generators

**Source spec:** [Batch A PH candidates](../../specs/lesson-example-improvements.md#batch-a-make-foundational-constructions-readable)

**Status:** planned. **Dependencies:** 00. **Lessons:** `ph-cubic`, `ph-quintic`.

## Work

- Prepare the cubic candidate with start \((-2,-1)\), generators \(2,2+i\). Explain the generator, its complex square, and speed \(4+t^2\); use midpoint speed \(17/4\) and length \(13/3\) where helpful.
- Prepare the quintic candidate with the same start and generators \(2,2+i,1+i\). Use midpoint generator \(7/4+3i/4\), speed \(29/8\), and length \(17/5\). Confirm the generator is genuinely quadratic and the resulting curve genuinely degree five.
- Recompute control-point examples and every dependent label, calculation, observation, and animation. Keep signed positive/negative offset comparisons. Select offset distances after checking curvature and regularity so the introductory offset remains understandable.
- Verify both the main curve and generator board are legible. Retain old geometry only as an explicit later exploration example if useful.
- Coordinate with task 05: its uniform-parameterization scene may keep its own PH geometry; do not silently change it through shared defaults.

Entry points: `src/learning/content/guidedLessons.ts`, `expansionGuidedLessons.ts`, `src/graphs/curves/ph/`, `src/bezeg/impl/curve/ph-math.ts`, and existing PH golden/property checks.

## Acceptance and checks

- Check control points, derivative/speed, midpoint values, and integrated speed with exact or independent reference calculations, rather than snapshots alone.
- The cubic and quintic are regular on the demonstrated interval; selected offsets are checked for singularities and described accurately. Distinguish corresponding normal offset distance from screen/chord distance.
- Both signs of the offset and generator dragging remain correct, with no stale derived geometry after scene changes or restoration.
- Run focused PH/content/scene tests, notation tests, typecheck/build, and browser checks for both lesson IDs in both languages, desktop/projection and 390 px. Record actual visual acceptance; the source review checked numbers only.
