# Handoff: school function graphs 06 F3 Part A (S3, polynomial zeros)

State: content, registration, chapter section, scripts and tests are written. NOTHING except the two `node --test` scripts has been run. `just typecheck` and `just unit ...` are not run; the new lesson test, the chapter test and the edited tests are unverified.

## Touched files
- New `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts` (sibling file: batch A file is 471 lines; helpers duplicated; exports `schoolFunctionGraphsBatchBGuidedLessons`, Part B should add its lesson there). Seven steps: poly-signs (default), poly-simple (default, zero 1 moved to -3), poly-double (default, p' shown), poly-triple (`triple`, p' shown), poly-degree (`degree-five`), poly-intercept (default, p(0)=2), poly-explore (`degree-five`, p' shown).
- New `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.test.ts` (real-graph scenes out of order and twice, parity/crossing, spec numbers recomputed from product form, merge/refusal, prose checks).
- Registered: `guidedLessons.ts` (import and map), `lessonMathNotation.test.ts` (set and id list), `demonstrations.ts` (dropped `lesson: false` on polynomial-zeros), `guidedLessonOwnership.ts`, `guidedExamplePreviewCopy.ts` (polynomial-zeros entry), `lessonCatalog.test.ts` and `familyChapters.test.ts` (removed polynomial-zeros from the pending lists).
- Chapter: `schoolFunctionGraphsChapter.ts` (new section after function-inverse, purpose widened), `schoolFunctionGraphsChapterRegistry.ts`, `schoolFunctionGraphsPreviewCopy.ts`, `schoolFunctionGraphsChapter.test.ts` (IDS, formula, facts, numbers, advertised-words test).
- Scripts: `scripts/generate-guided-example-inventory.cjs` (+`polynomialExpectedFor`), its test, `scripts/capture-guided-example-previews.cjs` (route regex), its test. `node --test` on both: 27 pass (`C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/node.log`).

## Remaining
1. `just typecheck`; `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts` with `BEZEG_MEMORY_FLOOR_GB=0.5`, logs to the tmp dir; fix failures.
2. Count updates not yet done: `guidedExamplePreviewCopy.test.ts` (70 -> 71 available ids, allCopy 77 -> 78), `authoredChapterCoverage.test.ts` (chapter-owned reference counts 82 -> 83), `guidedExamplePreviews.test.ts` functionsCards entry for school-function-graphs (ids add `school-function-graphs.polynomial-zeros.polynomial-zeros`, counts [1,2]); `tests/guided-lessons.smoke.spec.cjs` row (id polynomial-zeros, path `${BASE}/functions/polynomial-zeros`, titles Ničle polinoma in večkratnost / Polynomial zeros and multiplicity, steps 7, minFrames 14, add to LESSONS); `src/learning/LearningPage.test.tsx` maybe.
3. Known conflict: the card test requires inventory JSON, manifest and PNG per chapter-owned lesson (`docs/reviews/school-function-graphs/guided-example-inventory.json`, `src/images/learning/examples/school-function-graphs/`). Brief forbids capture (F5), so that test fails for polynomial-zeros until F5 or needs a pending-capture exemption: handler decision.
4. Mutations (one per assertion kind) not run: change a scene zero move (state), change `p(0)=2` in the prose (prose), change a multiplicity in the test table (parity).
5. Check SL/EN prose manually for the notation test.

## Notes
- Bash tool halves backslashes in command arguments and heredocs: edit lesson text only with the Edit tool.
- Spec deviations: none found. Step 4 uses `triple`; the merge route to it is stated in text and tested.
