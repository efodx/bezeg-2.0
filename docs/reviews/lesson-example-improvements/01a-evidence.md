# Task 01a evidence: Bézier and De Casteljau

**Status:** implemented 2026-10-24; browser acceptance pending (task 09). Worker notes: [01a-handoff.md](01a-handoff.md).

## Scenes

| Lesson | Steps | Fixture | View | Observation |
| --- | --- | --- | --- | --- |
| `bezier` | 1–4 | symmetric cubic \((-3,-2),(-3,2),(3,2),(3,-2)\) | `[-4.5, 4, 4.5, -3.5]` | \(B(1/2)=(0,1)\); endpoints, hull |
| `bezier` | influence | asymmetric cubic \((-3,-2),(-1,3),(2,-1),(3,2)\) | same | \(B(1/2)=(3/8,3/4)\); interior points pull without interpolating |
| `bezier` | free | demonstration default | current | exploration |
| `decasteljau` | 1–3 | quadratic \((-3,-2),(0,4),(3,-2)\), \(t=1/2\) | `[-4.5, 4.8, 4.5, -3]` | row \((-3/2,1),(3/2,1)\), result \((0,1)\) |
| `decasteljau` | 4–6 | symmetric cubic at \(t=1/2,1/4,3/4\) | same | results \((0,1)\), \((-33/16,1/4)\), \((33/16,1/4)\) |
| `decasteljau` | 7 | demonstration-default quartic, \(t=1/2\) | current | result \((0,7/4)\); retained richer case |

The former reconstruction step of `decasteljau` was folded into the new sequence. The Bézier chapter and its activities run on demonstration defaults and quote none of the replaced values, so they are unchanged.

## Checks

- `src/learning/content/bezierExamples.test.ts` (23 tests) compares an independent Bernstein/De Casteljau implementation with `PolynomialBezierCurve.eval` and `decasteljauScheme`, and checks fixtures, parameters, worked-example rows, Slovenian/English prose and view containment. 13 worker mutations were each caught. The handler checked \(t=1/4\) and the asymmetric midpoint by hand.
- Handler rerun: `guidedLessons`, `bezierChapter`, `lessonMathNotation`, `sceneContentAgainstGraphs`, `ChapterPage`, `bezierExamples`, `phExamples` tests: 120 passed.

## Gaps

No smoke rows existed for these lessons; they are added in task 09. Label legibility at both viewports is not yet browser-checked.
