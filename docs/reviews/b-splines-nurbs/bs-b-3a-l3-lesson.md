# BS-B-3a: the L3 knot insertion lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L3](../../specs/b-splines-nurbs-lessons.md#l3-knot-insertion-and-multiplicity-vstavljanje-vozla-in-večkratnost). Date 2026-11-03; implemented by a Sonnet worker, verified and repaired by curves handler 39.

## What changed

- New lesson action `knot-insertion` (`src/learning/model.ts`) with operations `insert` (a knot value), `set-example` (`quadratic`|`cubic`), `set-comb` and `reset`; `BSplineInsertionGraph` registers it. A non-finite value, an unknown example, or an insertion the graph refuses (outside the domain, above multiplicity `k+1`) throws, so a wrong scene fails its test; the refusal reason is also left in the graph state.
- L3 guided lesson `src/learning/content/bsplineInsertionGuidedLessons.ts`, six steps on lesson-fixture scenes: predict (L2 example, nothing inserted); insert `u=1` (five points, the old polygon as ghost); insert `u=1/2` into the original (the new points `(0.5,1)`, `(1.5,2)` are the de Boor level-1 points); the cubic with its simple knot `u=1` and double knot `u=2`, comb hidden, predict which derivative breaks (amended step 4: no insertion creates the double knot); the comb shown with the jump list (`κ` -1.4311 both sides of `u=1`, 8/3 to 16/3 at `u=2`, equal tangent); free exploration. `bspline-insertion` now has a lesson (`lesson: false` removed).
- Owner and chapter: the `b-splines` chapter owns L3 as it owns L1 and L2 (`guidedLessonOwnership.ts`, `bsplineChapterRegistry.ts`, a third section in `bsplineChapter.ts`); `bspline-insertion` left `CHAPTER_LINK_PENDING` (`patch-coons`, `bspline-extraction` and `euler-method` remain). The task plan put the L3 chapter section in BS-B-4; it landed here because every lesson needs an owning section, so BS-B-4 keeps only the L4 section. The chapter's "later lessons are not named" test no longer lists the insertion words. Preview copy, notation test list, catalog tests and the smoke row `bspline-insertion` were added.
- Handler repair: the lesson-fixture scenes for the cubic (steps 4 and 5) silently kept the quadratic. `prepareLessonFixtureScene` imports the fixture and then replaces the state with `{...getInitialState(), ...lessonDefaultState()}`; `BSplineInsertionGraph` had no `lessonDefaultState` override (as `DeBoorGraph` has), so the default example overwrote the imported curve. The override keeps the imported curve, its Reset target and example, with the rest fresh. The test had also evaluated the de Boor check point at `u=1` instead of `u=0.5`.
- No route or stored Preset changed.

## Checks

- Handler (curves handler 39), at `a21a89d8` unless noted: `npx tsc --noEmit` passed; `eslint` on the changed files passed; focused unit run (`src/learning`, `src/graphs/curves/bspline`, `src/graphs/base`, `src/demonstrations`) 150 files / 3526 tests passed; full unit suite 540 files / 10551 tests passed (3 skipped), clean tree; `just build` passed; `just smoke-lesson bspline-insertion` 2/2 (sl walk; en 390×844 points in view, math inside the viewport).
- Mutations, each run against `bsplineInsertionGuidedLessons.test.tsx`: `insert` as a no-op failed 4 tests, `set-example` 1, `set-comb` 2, `reset` 2; removing the `lessonDefaultState` override failed 3.
- Engineering review (Sonnet): no blocking findings. A refused insertion throws and leaves its refusal reason in the state, which the test asserts; the curve is unchanged.
- Mathematical review (Sonnet, independent scipy recomputation): every knot vector, inserted point, de Boor level-1 point, curve point (1, 1.5) at `u=0.5`, κ −1.4311 on both sides of `u=1`, 8/3 → 16/3 at `u=2` and the tangent (1.5, 0) agree with the prose and the spec; step order follows the spec. Its optional suggestion was adopted: step 2 now says the multiplicity list guarantees only C⁰ while the curve stays C¹.
- Browser (Haiku, preview of `a21a89d8`, `?learn=1`): sl 1440×900 and en 390×844 walk all 13 frames; board visible; the jump readout is absent in step 4 and shown in step 5; the lesson completes and the graph remains after exit; no console errors. The handler viewed the step 5 screenshot: cubic p0…p6, comb, multiplicity list C2/C1.

## Gaps

- The smoke row has no hooks; the scenes are covered by the unit test on the real graph.
- At 1440×900 the lesson card covers the upper middle of the board, including the jump at `u=2`; the card can be moved or hidden, and the view box matches the L2 lesson's convention. At 390×844 the steps 4 and 5 boards were not viewed behind the card.
- The step 2 sentence added after review was checked by the unit and notation tests only.
