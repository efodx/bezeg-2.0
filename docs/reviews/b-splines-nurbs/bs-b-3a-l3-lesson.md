# BS-B-3a: the L3 knot insertion lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L3](../../specs/b-splines-nurbs-lessons.md#l3-knot-insertion-and-multiplicity-vstavljanje-vozla-in-večkratnost). Date 2026-11-03, draft by the BS-B-3a worker (the handler completes it).

## What changed

- New lesson action `knot-insertion` (`src/learning/model.ts`) with operations `insert` (a knot value), `set-example` (`quadratic`|`cubic`), `set-comb` and `reset`; `BSplineInsertionGraph` registers it. A non-finite value, an unknown example, or an insertion the graph refuses (outside the domain, above multiplicity `k+1`) throws, so a wrong scene fails its test; the refusal reason is also left in the graph state.
- L3 guided lesson `src/learning/content/bsplineInsertionGuidedLessons.ts`, six steps on lesson-fixture scenes: predict (L2 example, nothing inserted); insert `u=1` (five points, the old polygon as ghost); insert `u=1/2` into the original (the new points `(0.5,1)`, `(1.5,2)` are the de Boor level-1 points); the cubic with its simple knot `u=1` and double knot `u=2`, comb hidden, predict which derivative breaks (amended step 4: no insertion creates the double knot); the comb shown with the jump list (`κ` -1.4311 both sides of `u=1`, 8/3 to 16/3 at `u=2`, equal tangent); free exploration. `bspline-insertion` now has a lesson (`lesson: false` removed).
- Owner and chapter: the `b-splines` chapter owns L3 as it owns L1 and L2 (`guidedLessonOwnership.ts`, `bsplineChapterRegistry.ts`, a third section in `bsplineChapter.ts`); `bspline-insertion` left `CHAPTER_LINK_PENDING` (only `patch-coons` and `bspline-extraction` remain). The chapter's "later lessons are not named" test no longer lists the insertion words. Preview copy, notation test list, catalog tests and the smoke row `bspline-insertion` were added.
- No route or stored Preset changed.

## Checks

- Worker: tests on a real graph (`bsplineInsertionGuidedLessons.test.tsx`), every scene run in one synchronous sequence. See the worker report for counts, mutation results, typecheck, lint, build and smoke results.

## Gaps

- The smoke row has no hooks; the scenes are covered by the unit test on the real graph.
- Not checked in a browser by the worker beyond `just smoke-lesson` (see the report).
