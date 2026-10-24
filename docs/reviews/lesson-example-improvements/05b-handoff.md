# 05b handoff (spline-parameterization), partial

## State
Lesson content, tests and typing are done and green. Not yet written: 05b-evidence.md, 05b-smoke-changes.md (contents below). The TS2322 at splineGuidedLessons.ts:1010 is fixed (fixture typed `LessonCurveFixture`, view `LessonViewBox`, imported from `../model`); `npx tsc --noEmit` printed nothing afterwards.

## Fixture and view
8 free points `[[-7,-2],[-7,1.5],[-5,0.5],[-4,1.5],[-3.2,-1],[4,2.5],[6,-1.5],[2,-3.5]]`, view `[-9,5,9,-5]`. 5 pieces, 4 joints, 12 derived points. Board points with joints visible: 8+12+10 = 30 (was 34/49/49/49/34).
Chords |p0p2|,|p2p3|,|p3p4|,|p4p5|,|p5p7| = 3.202, 1.414, 2.625, 8.006, 6.325, sum 21.571. Spans: alpha 0 -> 0.2 each; alpha 1/2 -> min 0.1196, max 0.2846; alpha 1 -> 0.0656 (shortest), 0.3711 (longest).
Third joint J3: alpha 0 (-2.133, 0) (= (-32/15, 0), independent midpoint-of-thirds formula), alpha 1/2 (-2.845, 0.094), alpha 1 (-3.325, 0.385); shift 1.25.
Samples t=k/11, k=1..10 (no end points). Per piece alpha 0: 2,2,2,2,2; alpha 1: 1,1,1,4,3 (knot margin > 0.01). Gap ratio 5.1 / 3.5 / 2.9. Alpha 1/2 per-piece counts are not stated (margin 0.0018 at a knot).
Scenes: 5 steps, all `lesson-fixture`, actions alpha (0.5, 0.5, 0, 1, 0.5), samples 10, hide-spline-fixed-points false (helper `splineParameterizationScene`).

## Files touched
- src/learning/content/splineGuidedLessons.ts (spline-parameterization section only, plus a type import on line 2)
- src/learning/content/splineGuidedLessons.test.ts (old numeric block replaced by a structure test; `fixtureLessons` now includes spline-parameterization; unused PARAM/param/import removed)
- src/learning/content/splineParameterizationExamples.test.ts (new, 17 tests)

## Checks
vitest splineGuidedLessons + lessonMathNotation + sceneContentAgainstGraphs + new test: 115 passed. Mutations M1-M12 (fixture point, sl/en prose numbers, view, alpha, sample count, distribution, junction result, conflation sentence, free-point count): every one failed tests. M8 (hidden derived points) only had a pattern miss in my script; the structure and scene tests assert `value: false`, but re-run that one mutation by hand.

## Remaining
1. Write 05b-evidence.md from the above.
2. Write 05b-smoke-changes.md for the `splineParameterization` row in tests/guided-lessons.smoke.spec.cjs (~line 734-785):
 - alpha array `[0.5, 0.5, 0, 1, 1]` -> `[0.5, 0.5, 0, 1, 0.5]`
 - samples array `[25, 25, 25, 25, 10]` -> `[10, 10, 10, 10, 10]`
 - points `[34, 49, 49, 49, 34]` -> `[30, 30, 30, 30, 30]`; setup `34` stays (route default is unchanged); the step-1 comment about hidden derived points is obsolete
 - `hideFixed ... toBe(step === 1)` -> `toBe(false)` at every step
 - duringLesson: samples `25` -> `10`; alpha 0 (exitStep 3) stays; the restore asserts stay
3. Pre-existing risk to check in browser: the alpha slider mid-lesson, and the user-state restore after the fixture swap.
