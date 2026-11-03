# Handoff: school 06 F3/F4 Part B (lesson S4), partial

No check has been run. Nothing is committed.

## Files touched (uncommitted)
- src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts: S4 `rationalLesson` (7 scenes, `rationalScene` helper), added to the exported array.
- Registration: src/demonstrations.ts (dropped `lesson: false` on `rational-function`), guidedLessonOwnership.ts (section `rational-function`), guidedExamplePreviewCopy.ts, schoolFunctionGraphsPreviewCopy.ts (id `school-function-graphs.rational-function.rational-function`), schoolFunctionGraphsChapterRegistry.ts, lessonMathNotation.test.ts (id list).
- Chapter: schoolFunctionGraphsChapter.ts (purpose widened, section `rational-function` after `polynomial-zeros`).
- Scripts: generate-guided-example-inventory.cjs (`rationalExpectedFor`), capture-guided-example-previews.cjs (+ test), tests/guided-lessons.smoke.spec.cjs (row `rationalFunction`).
- Count tests: authoredChapterCoverage (105), guidedExamplePreviewCopy (93, 100), familyChapters (dropped `rational-function` from the pending list), lessonCatalog (dropped it from the no-lesson list), schoolFunctionGraphsChapter.test.ts (IDS, section 3 facts, S4 numbers).

## Scenes
1. `rat-pole`: oblique, probe 10.
2. `rat-hole`: oblique, then denominator-1 moved to 1, which gives the hole example. Deviation: the pole is dragged onto the zero, not a zero onto the pole. A numerator zero moved to 2 would give the hole (2,3), not the spec's (1,2).
3. `rat-vertical`: horizontal, then numerator-2 moved to 2. Hole (2,1.5), pole -2.
4. `rat-degrees`: horizontal, f(10)=2.0625.
5. `rat-remainder`: oblique, remainder 0.375.
6. `rat-double-pole`.
7. `rat-explore`: oblique, free.

## Remaining, in order
1. Write the S4 tests in schoolFunctionGraphsBatchBGuidedLessons.test.ts:
   - Pattern: the S3 tests in the same file.
   - Graph: `createGraph('rational-function')`.
   - Scene states: assert model fields and `rationalFacts` (holes, poles, asymptote kind, probe).
   - Numbers recomputed independently: 0.375, hole (1,2), 2.0625, hole (2,1.5), sign pattern of the double pole, f(0)=0.
   - Prose: SL and EN contain the quoted values.
   - Mutations: one failure per assertion kind.
2. Add S4 cases to scripts/generate-guided-example-inventory.test.cjs (`expectFor('rational-function', ...)`).
3. Run `just typecheck`.
4. Run `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts` (`BEZEG_MEMORY_FLOOR_GB=0.5`, logs to the `b-` prefix).
5. Run the two `node --test` scripts.
6. Fix count or prose failures. Expected failure to leave: guidedExamplePreviews.test.ts.
7. Read the SL prose once for grammar.

Note: files are mixed LF/CRLF per file. Preserve each file's line endings. Python or bash heredocs halve backslashes, so use `chr(92)`.
