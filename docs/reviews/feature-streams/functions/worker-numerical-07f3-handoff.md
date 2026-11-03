# Handoff: numerical 07 F3 + F4 (partial)

Nothing was run except `just unit src/graphs/functions/EulerGraph.lesson.test.ts` (passed; log in `C:/Users/1337Hacker/.claude/jobs/36f6fc67/tmp/num-07f3/a.log`). Typecheck, lint, the broad unit set and the node tests were NOT run. No lesson or chapter test has been run.

## Done (uncommitted edits)
- `src/learning/model.ts:53`: `'euler-exact'` added to `FUNCTION_VISIBILITY_TARGETS`.
- `src/graphs/functions/EulerGraph.tsx`: `visibility: {"euler-exact": setShowExact}` in `lessonFunctionActions`.
- `src/graphs/functions/EulerGraph.lesson.test.ts`: new visibility test (passes).
- NEW `src/learning/content/numericalEulerGuidedLesson.ts`: lesson N5, 7 steps with SL and EN text, all written. Exports `eulerGuidedLessons`. Scenes (step ids): field-predict (end x=0, exact hidden), one-step (end 0.5, h 0.5, hidden), polyline (h 0.5, end 1, hidden), halve-h (h 0.25), error-ratios (h 0.125), initial-point (y0=2, h 0.25), euler-explore (default).
- Wiring: `numericalMethodsGuidedLessons.ts`, `numericalChapterRegistry.ts`, `guidedLessonOwnership.ts`, `demonstrations.ts` (`lesson: false` dropped), `guidedExamplePreviewCopy.ts` (euler-method entry).
- Test count and list updates: `guidedExamplePreviewCopy.test.ts` (89 and 96), `authoredChapterCoverage.test.ts` (102), `lessonMathNotation.test.ts` (register 'euler-method'), `lessonCatalog.test.ts`, `familyChapters.test.ts` (`CHAPTER_LINK_PENDING`).
- `numericalChapter.ts`: section `euler-method` added; purpose text widened.
- `numericalChapter.test.ts`: lists updated, a new "Euler section (N5)" describe added, and the "not advertised" test changed to the words runge/kutta/stiff.

## Remaining
1. Write `src/learning/content/numericalEulerGuidedLesson.test.ts` modelled on `numericalQuadratureGuidedLesson.test.ts`.
   - The readout ids are h, steps, end, value, exact, error, double-error, ratio.
   - Scene state: all scenes out of order and twice.
   - Independent Euler loop; every quoted token must equal the displayed value.
   - x-y named changes: h=0.5, 0.25, 0.125 (apply the actions manually). Values 0.5, 0.6328, 0.6872; errors 0.2358, 0.1029, 0.04854; ratios 3.12, 2.29, 2.12.
   - Also check the step 6 scene (y0=2, h=0.25): 4.8828, 5.4366, 0.5538, double-error 0.9366, ratio 1.69.
   - Check whether the end x = x0 scene (step 1) works with the real graph.
2. Extend `numericalExpectedFor` in `scripts/generate-guided-example-inventory.cjs` (about line 316) for the `euler-*` actions.
   - Allowed: choices euler-example and euler-step, parameters euler-x0, euler-y0 and euler-end, visibility euler-exact.
   - Visible objects: field curve, polyline curve, crosses curve, the initial point, and the exact functiongraph only when shown.
   - The expected points come from the model: [x0, y0] plus polyline nodes? The crosses are curves, not points.
   - Add a test in the inventory test file.
3. In `scripts/capture-guided-example-previews.cjs:57`, extend the route regex and `routeText` to accept exactly `/analysis/euler-method`, and add a test in the capture test file.
4. Add a row to `tests/guided-lessons.smoke.spec.cjs`: id euler-method, path `/bezeg-2.0/analysis/euler-method`, titles 'Polje smeri in Eulerjeva metoda' / "Direction field and Euler's method", 7 steps, minFrames 14. Add it to the LESSONS array.
5. Run `just typecheck`, `just lint <files>`, the broad `just unit` set and the node tests. Fix any counts that fail (e.g. LearningPage.test.tsx, the GUIDED_LESSON count, demonstration totals).
6. The `scripts/` capture and inventory tests may list the numerical-methods ids; check them.

## Notes
- Heredocs halve backslashes, so use the Edit tool for LaTeX.
- The text quotes 4-digit errors (0.4683, 0.2769, 0.1525) rather than the brief's 3-digit ones, to match the readout.
- The y'=x-y first ratio is 3.12, not 2.29; the text states this.
