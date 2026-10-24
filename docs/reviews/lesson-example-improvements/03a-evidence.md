# Task 03a evidence: rational curve and rational De Casteljau

**Status:** implemented 2026-10-24; browser acceptance pending (task 09). Worker notes: [03a-handoff.md](03a-handoff.md).

## Scenes

| Lesson | Steps | Fixture | Observation at \(t=1/2\) |
| --- | --- | --- | --- |
| `rational` | 1 | \((-4,-3),(-3,3),(3,3),(4,-3)\), weights \((1,1,1,1)\), view `[-6, 5, 6, -4.5]` | ordinary Bézier: \((0,3/2)\) |
| `rational` | 2 | same, \((1,2,1,1)\) | \((-9/11,21/11)\); share of \(P_1\) is \(6/11\) (from \(3/8\)) |
| `rational` | 3 | same, \((1,4,1,1)\) | \((-27/17,39/17)\); share \(12/17\) |
| `rational` | 4–5 | endpoints check at \((1,4,1,1)\); analysis back at equal weights | endpoints do not depend on weights |
| `rational-decasteljau` | 1 | quadratic \((-4,-3),(0,3),(4,-3)\), weights \((1,1,1)\) | \((0,0)\); the last coordinate stays 1 (ordinary counterpart) |
| `rational-decasteljau` | 2–3 | quadratic, \((1,2,1)\) | homogeneous \((0,3/2,3/2)\) projects to \((0,1)\) |
| `rational-decasteljau` | 4–6 | the existing cubic, \((1,1,1,1)\) then \((1,2,1,1)\) | \((0,3/2)\), then \((-9/11,21/11)\) from \((-9/8,21/8,11/8)\) |

Control points and the comparison parameter stay fixed while only one weight changes. The handler rechecked \((-9/11,21/11)\), \((-27/17,39/17)\) and the quadratic \((0,1)\) by hand.

## Checks

- `src/learning/content/rationalExamples.test.ts` compares homogeneous computations with the repo's `RationalBezierCurve`, the equal-weight reduction, the De Casteljau rows and results, view containment and prose in both languages.
- Handler mutation run (`mutate03a.py`, files restored after each): second weight 2→3, heavy weights moved to \(w_2\), a moved control point, quadratic weight 2→3, equal quadratic weights changed — each fails at least one test.
- Handler: `expansionGuidedLessons`, `additionalGuidedLessons`, `rationalExamples`, `lessonCatalog`, `lessonMathNotation`, `sceneContentAgainstGraphs` tests pass; `npx tsc --noEmit --pretty false` clean. `lessonCatalog.test.ts` pins were updated by the handler for all lessons that now use fixtures.

## Gaps

No smoke rows existed for these lessons; they are added in task 09. Weight labels at 390 px are not yet browser-checked.
