# 16b handoff (partial: research only, no source edits)

## Files touched
None. No source, test or doc file was edited, and no check was run. Only this note was written.

## Done (reading only)
- Read the brief, task files 16 and 17, spec B3 (`docs/specs/triangulation-voronoi-lessons.md:109-118`), and the 17a commit `dccdf58a` as the file-by-file template.
- Files the 17a/15b pattern touches, to repeat for `delaunay`:
  - `src/demonstrations.ts`: drop `lesson: false` on the `delaunay` entry.
  - `src/learning/runtime/lessonCatalog.test.ts`: the lessonless list becomes `['interp-runge']`. Also add `delaunay` to the lesson id list that 17a extended in that file.
  - `src/learning/content/compgeoGuidedLessons.ts` (CRLF): add the `delaunay` lesson after `pointSetTriangulation` (ends ~line 1045) and to the array at line ~1475.
  - `src/learning/content/compgeoGuidedLessons.test.ts`: lesson order and step counts (now 7 lessons, so 8).
  - `src/learning/content/guidedExamplePreviewCopy.ts` and its test: add a `delaunay` copy entry; count 87 -> 88.
  - `src/learning/content/familyChapters.test.ts`: `CHAPTER_LINK_PENDING` drops `delaunay`, leaving `['patch-coons']`. The `GUIDED_LESSON_AVAILABLE_IDS` count goes 80 -> 81.
  - `src/learning/chapter/guidedLessonOwnership.ts`: add `'delaunay': {chapterId: 'triangulations-voronoi', sectionId: 'delaunay'}`. `authoredChapterCoverage.test.ts`: reference count 91 -> 92 (it appears twice).
  - `src/learning/content/lessonMathNotation.test.ts`: the long id list and the id map gain `delaunay`.
  - `src/learning/content/triangulationChapterRegistry.ts`: add `'delaunay': 'delaunay'`.
  - `src/learning/content/triangulationChapter.ts` (CRLF): add a `withExample('delaunay', {...})` section after `point-set-triangulation`.
  - `src/learning/content/triangulationChapter.test.ts`: section order `['why-triangulate', ID, B2, 'delaunay']`; add a section test and a `resolveGuidedExample` test.
  - Same file: the "unreleased lessons" scan drops `delaunay` for B2 and still excludes the Voronoi words.
  - B2's step 6 text gains a forward link to B3. Find the existing pattern with `grep -n "lesson\." src/learning/content/*Lessons.ts`.
  - `tests/guided-lessons.smoke.spec.cjs`: a `delaunay` row like `pointSetTriangulation`.
  - New test `src/learning/content/compgeoDelaunayLesson.test.ts`, modelled on `compgeoPointSetTriangulationLesson.test.ts`.
- Delaunay graph facts for the lesson scenes and test:
  - Readout DOM: `[data-delaunay="readout"] [data-readout=flips|illegal|min-now|min-start|angles-now|angles-start]`, `[data-delaunay="incircle"]`, `[data-delaunay="cocircular"]`, `[data-delaunay="done"]`, `button[data-action=next-step]`.
  - Kernel helpers in `src/graphs/compgeo/delaunayRun.ts`: `circumcircle`, `illegalEdges`, `runDelaunay`, `angleSummary`, `quadValue`.
  - Presets in `delaunayPresetCollection.ts`: `DELAUNAY_QUAD`, `DELAUNAY_SQUARE`, `DELAUNAY_EXAMPLES`. The quad start is `set-triangulation [[0,1,2],[0,2,3]]` (diagonal ac).
  - Test harness: `DelaunayLessonActions.host.test.tsx` (`manualScheduler`, `Observed.run1`, the `traceStep` / `selectTriangle` helpers).
  - Actions are `algorithm-trace`, `set-trace-step` and `select-triangle` (16a); 15a/point-set actions are `set-points`, `set-triangulation`, `flip-edge`, `select-edge`, `set-overlay`.
- B2 lesson structure to copy: `compgeoGuidedLessons.ts:861-1045`. It has a `triScene` helper, `formulaBlocks`, `workedExamples` with `calculationLatex` / `resultLatex`, and a calculation frame on the steps that quote a worked example.

## Unverified / not started
Everything: the lesson text (SL and EN), the tests, the chapter section, the ownership move, the smoke row and the mutations. No tsc, eslint, unit or build was run. I found no spec disagreement, but I did not check any number against the readouts yet.

## Next step
1. Add the `delaunay` lesson, with the 7 steps from task 16 item 2 and 1-based point names (spec `p_1p_4, p_2p_4, p_4p_6` are `P_2P_5, P_3P_5, P_5P_7`). Use `set-trace-step 1` for the +64 determinant and for the 3 illegal edges at the step-6 frames (indices 1, 6, 14).
2. Write the lesson test (readouts, plus the circle centre `(2, 7/3)` and `r^2 = 85/9` against `circumcircle`, and the illegal edges against the trace).
3. Do the chapter section, ownership and count edits listed above.
4. Run the worker checks from the brief and the mutations.
