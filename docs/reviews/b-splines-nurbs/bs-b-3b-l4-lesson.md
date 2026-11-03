# BS-B-3b: the L4 Bézier extraction lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L4](../../specs/b-splines-nurbs-lessons.md#l4-bézier-extraction-izvlek-bézierjevih-odsekov), [ADR 0038](../../adr/0038-open-as-bezier-router-state-handoff.md). Date 2026-11-03; implemented by a Sonnet worker, not yet verified by the handler.

## What changed

- New lesson action `bezier-extraction` (`src/learning/model.ts`) with operations `move-point` (`index`, `to`), `set-example` (`quadratic`|`cubic`) and `reset`; `BSplineExtractionGraph` registers it. `move-point` sets the points and `moved` exactly as the drag handler does (`dragMoved`), so the affected-pieces highlight and the "changed" marks show. An index that is not an integer in range, a non-finite position or an unknown example throws (a content error).
- Fix first: `BSplineExtractionGraph` had `lessonFixtureData` but no `lessonDefaultState`, so a lesson-fixture scene imported the cubic and the default quadratic then replaced it. The override (as in `BSplineInsertionGraph`) keeps degree, knots, points, origin and example.
- L4 guided lesson `src/learning/content/bsplineExtractionGuidedLessons.ts`, six steps on lesson-fixture scenes: predict the piece count (quadratic, 2); the pieces and the junction `(2,2)` = ½P1 + ½P2 (ratio ½ = (1−0)/(2−0)); open a piece in the Bézier Demonstration (text only: the inspector button "Open as Bézier curve", the browser Back returns; no scene action navigates); the cubic with `P2` moved from `(2,3)` to `(2,4)` (its support is `(0,2)`, so pieces 1 and 2 change and piece 3, `(3.5,1),(4,1),(5,3),(6,0)`, does not); the piece count equals the distinct interior knots plus one (quadratic 2, cubic 3); free exploration.
- Owner and chapter: the `b-splines` chapter gains a fourth section `bspline-extraction` owning L4 (`guidedLessonOwnership.ts`, `bsplineChapterRegistry.ts`, `bsplineChapter.ts`); the chapter test's "later lessons are not named" list drops `izvlek`/`extraction`; `bspline-extraction` left `CHAPTER_LINK_PENDING`; `demonstrations.ts` lost `lesson: false`; preview copy, catalog and coverage counts (`authoredChapterCoverage` 115, preview copy 101/108) and the smoke row updated. This absorbs the chapter section of BS-B-4.
- No route or stored Preset changed. `bspline-extraction` stays in `POSTER_PENDING` (no catalog poster captured).

## Checks

- Worker, at `55ced5ec` plus the working tree: `npx tsc --noEmit` passed; `eslint` on the 16 changed `.ts`/`.tsx` files passed; `just unit src/learning src/demonstrations src/graphs/curves/bspline` passed; `just build` passed; `just smoke-lesson bspline-extraction` passed.
- Mutations against `bsplineExtractionGuidedLessons.test.tsx` (9 tests): `move-point` as a no-op failed 3, `set-example` 1, `reset` 2; removing the `lessonDefaultState` override failed 5.

- Handler (curves handler 39): full unit suite 542 files / 10583 tests passed (3 skipped) on the worker tree; after the wording fixes below, the lesson, notation and preview-copy tests passed again.
- Review (Sonnet, mathematics, prose and engineering; independent Boehm recomputation): every number in the lesson and the chapter section is correct (pieces, junction (2,2) with ratio ½, counts 2 and 3, P2 (2,3)→(2,4) changes pieces 1 and 2 only, junction (2,2.25)→(2,2.75)); handler and tests sound. Adopted Slovenian wording fixes: "preveri" for "preverimo", "skupno krajišče" for "skupna krajnica", and the reset button named in quotes in both languages so it is not confused with the browser's Back.
- Browser (Haiku, preview of the worker tree): sl 1440×900 and en 390×844 walk all 13 frames, finish and exit with the graph still mounted, no console errors; the moved-point step shows the cubic and marks pieces 1 and 2 changed; "open as Bézier" on piece 1 opens `/bezeg-2.0/bezier/curve` with (0,0), (1,2), (2,2), and Back returns to a plain extraction page without the lesson.

## Gaps

- At 390×844 the lesson card covers most of the board in observation frames (shared lesson runtime, as in L3).

- The smoke row has no hooks; the scene states are covered by `bsplineExtractionGuidedLessons.test.tsx` on the real graph. The button's presence is unit-tested with a stub `openAsBezier` host; the real router navigation was not exercised in a browser by the worker.
- Back from the Bézier page returns to a fresh extraction page (ADR 0038: its state is lost), which step 3 says.
