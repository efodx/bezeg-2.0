# 02 PH examples: handoff (content and tests done; evidence docs remain)

## Done

- `guidedLessons.ts` (ph-cubic): `phCubicFixture` (P0 (-2,-1), hodographs (2,0),(2,1)), `phCubicView` [-3.2, 2.7, 3.4, -2.7], `phCubicScene` helper. Scenes: 1 fixture; 2 fixture + evaluation point 0.5; 3 d=1; 4 d=-1; 5 d=1 + offset (edit exercise w1=2+2i, arc length 16/3); step 6 unchanged. New formula block `ph-offset` (with normal), exact worked examples (control points; speed 4+t^2, 17/4, length 13/3), calculation frames added to steps 1 and 2 (each step has max 3 frames), edge cases (inner radius >= 4, slider [-3,3]).
- `expansionGuidedLessons.ts` (ph-quintic): `phQuinticFixture` (hodographs (2,0),(2,1),(1,1)), view [-3, 2.2, 2.5, -2.6], `phQuinticScene`; offsets 0.5, -0.5, 1; worked example 29/8 and 17/5; `ph-quintic-offset` with normal; edge case radius 1.
- Tests: `guidedLessons.test.ts` (distances [1,-1,1]), `expansionGuidedLessons.test.ts` (`\\tfrac{29}{8}`), new `phExamples.test.ts` (21 tests, exact fractions, independent power-basis/Bernstein, phControlPoints/phSigmas/phOffsetRational, curvature, 1+d*kappa, view containment, fixture identity via adapter, old numbers absent in adapted and raw content).
- Corrections to the earlier plan: fifth forward difference of the quintic control points is (0, 2/5); 5! times it is (0, 48). The "vertical gap 5/3 at t=1" claim is only a tangent-line statement; the lesson now says vertical shift of the offset point is 1 at t=0 and 3/5 at t=1 (normal (4/5,-3/5)).

## Checks

- vitest (guidedLessons, expansionGuidedLessons, phExamples, lessonMathNotation, sceneContentAgainstGraphs): 5 files, 96 tests pass.
- tsc: no error in my files; one error in `splineGuidedLessons.test.ts(168)` (another worker's file).
- Mutation script `C:\Users\NonFriedMotherBoard\.claude\jobs\b79000ae\tmp\mutate02.cjs` (restores files). All caught: M1 cubic w1=2+2i, M2 quintic d=-1, M3 cubic d=-4 (also non-singularity), M4 quintic w2=(1,0), M5 cubic view shrunk, M6 phControlPoints 1/(n+1) (9 failures), M7 offset weights x1.01, M8 old number 7.890625 reinserted in expectedState.
- Logs in the same tmp dir (02-vitest.log, 02-tsc.log, 02-mut.log).

## Remaining

1. Write `02-evidence.md` (scenes, inputs, views, offsets, observations, checks above, gaps: no browser or build run, no smoke run, view/readout clearance not browser-checked).
2. Write `02-smoke-changes.md`: `tests/guided-lessons.smoke.spec.cjs` has no rows for ph-cubic or ph-quintic (only param-uniform-ph). Propose rows for `/bezeg-2.0/ph/cubic` (Kubična PH-krivulja / Cubic PH curve, 6 steps, probe start point near (-2,-1) and readout 4.333) and `/bezeg-2.0/ph/quintic` (Kvintična PH-krivulja / Quintic PH curve, 5 steps, readout 3.400); copy the row format from an existing row.
3. Handler: smoke-test both lessons in SL and EN (readout top-left clear of curve, offsets inside view).
