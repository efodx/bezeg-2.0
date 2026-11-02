# Worker handoff: projective 07e (partial)

## Done
- `src/learning/model.ts`: five `five-point-*` operations added to the `projective` union, with the doc comment and the import of `FivePointExampleId`.
- `src/graphs/projective/FivePointGraph.tsx`: `applyProjectiveAction` (strict checks; set-third also rejects an arc end) and `registerLessonActions`. The other projective graphs already reject unknown operations by name.
- `src/graphs/projective/FivePointLessonActions.host.test.tsx`: new. The single run of this file passed. It covers action versus control for every operation, the strict refusals and cross-graph rejection.
- `src/learning/content/projectiveFivePointGuidedLesson.ts`: new, 9 steps (predict, conic, ends, weight, bezier, parallel tangents, hyperbola, line pair, pencil), SL and EN. It has not been run through any test yet.
- `src/learning/content/projectiveConicsGuidedLessons.ts`: imports `fivePointLesson` and appends it to the exported array.
- `src/demonstrations.ts`: `lesson: false` dropped for `projective-five-point` (the last python edit; verify that it applied).

## Remaining
1. `src/learning/chapter/guidedLessonOwnership.ts`: add `projective-five-point` with owner `rational-curves/worked-conic`. The `projective-conics` chapter test forbids the words "five-point" and "pet točk" in the chapter, so do not use that chapter.
2. `guidedExamplePreviewCopy.ts`: add a preview entry, then fix the counts in its test (83 to 84, 90 to 91) and in any `guidedExamplePreviews` test that needs it.
3. `lessonMathNotation.test.ts`: register `projective-five-point` in the id list (line 176).
4. `lessonCatalog.test.ts:187-188`: remove `projective-five-point` from the no-lesson list.
5. `tests/guided-lessons.smoke.spec.cjs`: add one row, copied from `projectivePolePolar` at line 1985, with 9 steps and titles `Stožnica skozi pet točk` / `A conic through five points`. Add it to `LESSONS` (line 2002).
6. Write `src/learning/content/projectiveFivePointLesson.test.ts`, modelled on `projectivePoleLesson.test.ts`. It must cover the independent numbers, the S6 literal at `docs/specs/school-function-graphs-lessons.md:121`, per-field quoted points and values, and scenes applied out of order and twice.
7. Run `just typecheck`, `just lint` and the broad `just unit`. Remove the temporary dump test if present (it was already deleted).

## Notes
- The lesson model has no link field, so the `MIN_CIRCLE_PIECES` note is prose only (step 6).
- The parabola is covered only in the test; there is no parabola step. The lesson has 9 steps, not the spec's 7.
- Mutation list not yet written.
