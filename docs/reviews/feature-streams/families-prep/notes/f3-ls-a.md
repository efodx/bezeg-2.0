# F3 level-sets batch A (LS5), slice 1: actions and lesson content

## Written
- `src/learning/model.ts`: `LessonAction` kind `levelsets` with three operations.
  - `set-objective {p, q}`: integers -9..9 (the maximum of `p x + q y`).
  - `set-constraints {constraints: {a, b, c}[]}`: replaces the user rows `a x + b y <= c` (1..5 rows, a, b in -9..9 not both 0, c in -30..30).
  - `set-sweep {sweep}`: integer -100..100, the line `p x + q y = sweep`.
  - Field names are the graph's `LpState` fields. No walk action: the graph stores no walk position (the walk is derived from the rows and the objective). Contour actions are not added.
- `src/graphs/levelsets/LinearProgramGraph.tsx`: `applyLevelSetsAction`, `refuseUnknown`, `commitLp`, `registerLessonActions` (after `setRowCount`, before the Text section). The merged state goes through `parseLpState` before any write; unknown fields refused; error `levelsets <op>: <field> <reason>.`; exhaustive `never` switch; only changed fields are written through `edit`. No new readouts were needed.
- `src/graphs/levelsets/LinearProgramLessonActions.host.test.tsx`: 6 tests (each action equals the matching typed inputs in state, readouts and status; one synchronous multi-action sequence; checkpoint restore; invalid data changes nothing, 22 bad actions; `supportsLessonAction`).
- `src/learning/content/levelSetsGuidedLessons.ts`: `linearProgrammingLesson` (7 steps, two formula blocks, two worked examples, sl and en), `levelSetsSceneActions`.

## Observed
- Red: with `registry.on("levelsets", ...)` commented out, all 6 host tests failed (`UnsupportedLessonActionError`), `.command-logs/f3-ls-a/host-red.log`; restored, 6 passed (`host1.log`).
- `just unit src/graphs/levelsets`: passed (`levelsets.log`). `npx tsc --noEmit --pretty false` clean after the actions (`tsc1.log`) and after the content (`tsc2.log`); a final run is in `tsc3.log`.
- Notation: a temporary copy of `lessonMathNotation.test.ts` with `linearProgrammingLesson` added passed its two scan tests; only the expected-id list assertion failed, because it lacks the new `linear-program` id (the skeleton slice adds the list entries). Temporary files deleted.
- Probe of the real readouts, sl and en, for nine states: `.command-logs/f3-ls-a/probe.txt` (the probe test is deleted).

## Numbers per step (all from the probe)
1. Default: 4 vertices (0;0), (3;0), (2;3), (0;4), 2 tight constraints each, optimum 12 at (2;3).
2. Sweep 6: readout `3x + 2y = 6`; k = 9 passes (3;0), k = 12 passes (2;3) (default sweep 9 and `through` 12).
3. Sweep 12: vertex values 0, 9, 12, 8; optimum 12 at (2;3); `through` = `3x + 2y = 12`. Theorem: a linear function on a segment is a weighted average of the endpoint values, every point is a weighted average of the vertices.
4. Walk (0;0) 0, (3;0) 9, (2;3) 12 (moves to the better neighbour; neighbours 9 and 8 of the origin).
5. Objective (1,2), sweep 8: values 0, 3, 8, 8; status optimal segment (0;4)-(2;3), value 8; walk (0;0)->(0;4), stops beside an equal neighbour.
6. Rows (1,1,4), (1,3,6), (1,0,3), sweep 11: vertices (0;0), (3;0), (3;1), (0;2); values 0, 9, 11, 4; 3 tight at (3;1), others 2; optimum 11; walk (0;0), (3;0), (3;1). Redundancy of x+y<=4 argued in the text: y <= (6-x)/3 and x <= 3 give x+y <= (2x+6)/3 <= 4.
7. Row (1,-1,2), objective (1,1): unbounded region, 2 vertices (0;0), (2;0), status "objective is unbounded", direction (1;1), walk not drawn. Infeasible after the learner types b = 1, c = -1 into row 1: status "empty region, no optimum".

## Learner actions
Steps 2 and 3 type k into "Vrednost k premice cilja"; step 4 reads the walk rows; step 6 reads the vertex rows; step 7 types b and c of row 1 and then explores freely.

## Deviations
- 7 steps: the spec's step 6 (degenerate and unbounded) is split into step 6 (degenerate) and step 7 (unbounded plus free exploration, the infeasible status after a learner edit). The spec's steps 2 and 3 stay separate.
- The default sweep is 9 (the Demonstration default), so step 4's scene is the default; the step 1 scene shows the line at k = 9 as well.
- The quoted vertex coordinates are whole numbers (all spec examples have integer vertices); the graph's fraction display was not exercised by the lesson, only mentioned in an edge case.

## Still to do (other slices)
- Chapter, registry and wiring, `lesson: false` removal for the linear-program row, test lists (`lessonMathNotation` list and expected ids, `familyChapters`, lesson catalog lists), smoke row, localization terms (kriterijska funkcija, omejitveni pogoj, dopustno območje are in `sl.ts` already).
- Content test: recompute vertices, values, tight counts and the walk with the kernel for every scene; the red evidence for it.
- Review of the one-shot text is outside the review scope (spec rule).

## Doubts
- `commitLp` reports `field reason` (for example `objective.p out-of-range`), shorter than the randomness model's messages; the limits are in the model's error but not printed.
- Row objects with extra fields (`{a, b, c, d}`) are accepted: `parseLpState` drops unknown row fields; only top-level action fields are refused.
- Step 6 SL: "izrojeno oglišče" is a proposed rendering of "degenerate vertex"; not researched.

## Slice 2: chapter skeleton and wiring (worker)

### Written
- New `src/learning/content/levelSetsChapterRegistry.ts` (id `level-sets`, section `linear-programming` -> `linear-program`, lesson id `level-sets-linear-programming`) and `levelSetsChapter.ts` (family `analysis`, title *Nivojnice, gradient in optimizacija* / *Level sets, gradient and optimization*, one section with four paragraphs, formula, example at the end, prerequisite link `analytic-lines#normal-parallel-perpendicular`).
- Wiring: `chapterOwnedLessons.ts` (+2 lines), `familyChapters.ts` (+2: import and entry directly after `numericalChapter`, before `fourierChapter`), `guidedLessonOwnership.ts` (`'linear-program'` -> level-sets/linear-programming), `LearningPage.tsx` (`topicPreviews` entry, text alt only; strand `functions` now `... numerical-methods, level-sets, fourier-series ...`), `guidedExamplePreviewCopy.ts` (`'linear-program'` copy), `graphs/levelsets/registration.ts` (`lesson: false` removed from `linear-program` only; `contour-map` keeps it) and its composition test (now expects exactly `['contour-map']` to opt out).
- Tests: `familyChapters.test.ts` (id list + `level-sets`; `CHAPTER_LINK_PENDING` without `linear-program`; minimum sections 1 for `level-sets`, since every other lesson chapter's minimum is 2 or more and a one-section chapter had no rule), `fourierChapter.test.ts` (fourier index = numerical + 1 -> + 2, level-sets between; `at(-5)` unchanged, counted from the end), `LearningPage.test.tsx` (chapters 34 -> 35; thumbnails stay 24, the poster is pending), `authoredChapterCoverage.test.ts` (chapters 34 -> 35, references 155 -> 156, expected `level-sets.<section>.linear-program`), `lessonLookup.characterization.test.ts` and `runtime/lessonCatalog.test.ts` (lessonless list without `linear-program`; one canonical-example row), `lessonOwnerIntegrity.test.ts` (+`level-sets`), `lessonMathNotation.test.ts` (set entry and `'linear-program'` in the expected-id list).
- Smoke: `tests/guided-lessons.smoke.spec.cjs` row `linearProgram` (7 steps, minFrames 16, route `/analysis/linear-program`, added to the lesson list); `tests/unified-learning.smoke.spec.cjs` chapter list + minimum `'level-sets': 1`.
- `docs/localization.md`: two rows (README-table terms; plain words not in the table, marked handler-unreviewed).
- `levelSetsGuidedLessons.ts` and `LinearProgramGraph.tsx` not touched.

### Observed (slice 2)
- `npx tsc --noEmit --pretty false`: clean (`tsc4.log`).
- `just unit src/learning src/graphs/levelsets` (`unit2.log`): 158 of 159 files passed; the one failure was `fourierChapter.test.ts` (adjacency "fourier = numerical + 1"; fixed to + 2, my first `at(-6)` edit was wrong and was reverted to `at(-5)`). Re-run of `fourierChapter.test.ts` and `familyChapters.test.ts` passed (`unit3.log`). `lessonMathNotation.test.ts`, `familyChapters.test.ts` (450-word floor, macros outside math) passed in the full run; no edit to `levelSetsGuidedLessons.ts` was needed.
- `just build` passed (`build.log`); `just smoke-lesson linear-program` passed, 2 tests (sl walk, en 390x844) (`smoke.log`).
- Not verified: the full smoke checklist, the Learn page in a browser, `just check`.

## Outcome (slice 3)
- Review fixes in `levelSetsGuidedLessons.ts` (sl and en): step 7 (false "optimum needs boundedness" replaced by the weighted-average-covers-a-bounded-polygon wording; "ni omejen mnogokotnik" / "not a bounded polygon"), step 3 en ("only touches"), step 1 "feasible intersection" / "dopustno presečišče", "izrojeno (degenerirano) oglišče" in the summary (first use); the edge-case line on unbounded regions and `levelSetsChapter.ts` "Meje" paragraph carried the same claim and were corrected.
- Host test: +1 case (row object with extra field accepted, field dropped); 7 tests.
- New `levelSetsGuidedLessons.test.ts`: 10 tests (exact-fraction recomputation, 2 languages x 7 scenes out of order and twice in one `act`, learner actions, quotes in sl/en, worked examples, chapter prose, ownership). Red: step 3 sl scene value 12 -> 13 failed the quote test (`content-red.log`), restored.
- Checks (all in `.command-logs/f3-ls-a/`): tsc clean (`tsc5.log`); `just lint` passed (`lint.log`); unit set passed (`unit4.log`); six sweeps with `linear-program` + `src/graphs/base src/learning/runtime` passed (`sweeps.log`); `just build` passed (`build2.log`); `just smoke-lesson linear-program` passed (`smoke2.log`).
- Not run: full smoke checklist, `just check`.

## Handler review (handler 12)
- Sonnet mathematical and engineering review (`.command-logs/f3-ls-a/review.md`): every number recomputed. Two blocking findings, both fixed in slice 3 in the lesson and the chapter: "optimum at a vertex only for a bounded region" was false (with \(x,y\ge0\) the region holds no line, so an existing optimum is at a vertex), and an unbounded region is still a polygon, only not a bounded one. Non-blocking wording fixes applied; extra row fields are accepted and dropped by `parseLpState`, as in the other families (top-level fields refused), documented by a host-test case.
- Handler check: in the plane, a third constraint tight at a vertex bounds a half-plane that contains the feasible cone, so the chapter's "some constraints are redundant" at a degenerate vertex holds.
- Term decision: *izrojeno (degenerirano) oglišče*, row in `docs/tasks/level-sets/README.md`. The plain words in `docs/localization.md` marked handler-unreviewed stay so.
- Owed to F4–F6 of task 06: chapter page not walked in a browser; the one-section chapter minimum (`'level-sets': 1`) rises when Batch B adds sections.
