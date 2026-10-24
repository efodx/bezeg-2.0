# Task 02 evidence: PH examples

**Status:** implemented 2026-10-24; browser acceptance pending (task 09). Mathematics and scene plan: [02-handoff.md](02-handoff.md).

## Scenes

Both lessons prepare every scene with a `lesson-fixture` curve and view; free-exploration defaults are unchanged.

| Lesson | Fixture | View | Offsets |
| --- | --- | --- | --- |
| `ph-cubic` | start \((-2,-1)\), generators \(2,\ 2+i\) | `[-3.2, 2.7, 3.4, -2.7]` | \(d=1\) (outer, below), \(d=-1\) (inner, above), \(d=1\) while the learner edits \(w_1\) (suggested \(2+2i\), length \(16/3\)) |
| `ph-quintic` | start \((-2,-1)\), generators \(2,\ 2+i,\ 1+i\) | `[-3, 2.2, 2.5, -2.6]` | \(d=0.5\), \(d=-0.5\), \(d=1\) on the outer side |

## Mathematical checks

`src/learning/content/phExamples.test.ts` (21 tests) computes exact fractions independently of `ph-math.ts` and compares them with `phControlPoints`, `phSigmas` and `phOffsetRational`, and checks that the adapted lessons carry exactly these fixtures.

- Cubic: \(w(t)=2+it\), speed \(4+t^2\) (minimum 4), midpoint speed \(17/4\), length \(13/3\); control points \((-2,-1),(-2/3,-1),(2/3,-1/3),(5/3,1)\); curvature \(4/(4+t^2)^2\), radius at least 4, so \(d=\pm1\) is regular.
- Quintic: midpoint generator \(7/4+3i/4\), speed \(29/8\), length \(17/5\); \(w_0-2w_1+w_2=-1-i\neq0\), so the curve is genuinely degree five; radius at least 1 (at \(t=1\)), so \(|d|=0.5\) is regular on both sides and \(d=-1\) (a cusp) is avoided.
- Offset points are exactly \(|d|\) from the curve along the normal; the prose describes the vertical shift of the offset point, not the screen gap.

Mutations (script `mutate02.cjs`, restored after each run) each failed at least one test: cubic \(w_1=2+2i\), quintic \(d=-1\), cubic \(d=-4\), quintic \(w_2=1\), shrunk cubic view, wrong Bernstein normalization in `phControlPoints`, scaled offset weights, the old \(7.890625\).

## Commands

- `npx vitest run` on `guidedLessons`, `expansionGuidedLessons`, `phExamples`, `lessonMathNotation`, `sceneContentAgainstGraphs` tests: 96 passed (handler rerun).
- `npx tsc --noEmit --pretty false`: clean in these files.

## Gaps

- `tests/guided-lessons.smoke.spec.cjs` had no rows for either lesson; rows are added in integration (task 09).
- Readout clearance and offset visibility are not yet browser-checked in either language or at 390 px.
