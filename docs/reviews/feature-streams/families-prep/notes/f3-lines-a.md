# F3 lines batch A (L1, L2) - PARTIAL handoff (budget signal)

Recipe: `f3-trig-a.md` (checklist and pitfalls). NOTHING HAS BEEN RUN YET: no tsc, no unit test, no smoke. Dir `.command-logs/f3-lines-a/` exists, empty.

## Done (written, unverified)
- `src/learning/model.ts`: `LessonAction` kinds `lines` / `set-mode` (mode) and `lines` / `set-points` (`points`: partial record P,Q,R,S,T,O,B -> {x,y}).
- `src/graphs/lines/LineGeometryGraph.tsx`: `applyLinesAction` (validates fully before any write: mode in LINE_MODES; handles named in POINT_FIELDS; integer coordinates within +-8; at least one handle) + `registerLessonActions`, imports of `LessonAction`, `LessonActionRegistry`. `setState(next)` is one synchronous write.
- `src/graphs/lines/registration.ts`: `lesson: false` removed (comment updated).
- `src/learning/content/analyticLinesGuidedLessons.ts` (L1 `lineFormsLesson`, L2 `lineNormalLesson`, 5 steps each, sl+en, one worked example each, `lineSceneActions`), `analyticLinesChapterRegistry.ts` (id `analytic-lines`, sections `forms-of-a-line`, `normal-parallel-perpendicular`, lesson ids `line-geometry-forms`/`line-geometry-normal`), `analyticLinesChapter.ts` (family `plane-geometry`, prose likely >450 words per language, unchecked).
- Wiring: `chapterOwnedLessons.ts`, `familyChapters.ts` (before projectiveConicsChapter), `guidedLessonOwnership.ts` (`line-geometry` -> `analytic-lines`/`forms-of-a-line`), `LearningPage.tsx` strand (`triangle-geometry`, `analytic-lines`, `projective-conics`), `guidedExamplePreviewCopy.ts` (`line-geometry` copy; no thumbnail row added to `topicPreviews` on purpose).
- Test lists edited (sed): `familyChapters.test.ts` (pending list without line-geometry; id order; min 2 sections), `lessonLookup.characterization.test.ts:137`, `lessonCatalog.test.ts:192`, `lessonOwnerIntegrity.test.ts`, `authoredChapterCoverage.test.ts` (26 chapters + key line; the reference count 137 at line 60-61 NOT yet updated, expect 137 + 2 or + 4), `lessonMathNotation.test.ts` (import, set entry, expected id pair).
- Smoke row `lineGeometry` (5 steps, minFrames 11) in `tests/guided-lessons.smoke.spec.cjs`, added to `LESSONS`.

## Still to do
1. `npx tsc --noEmit --pretty false` (log to `.command-logs/f3-lines-a/tsc.log`); fix errors.
2. Edit `src/graphs/lines/registrationComposition.test.ts:~37` (the test asserts every row has `lesson === false`; change to expect no row opts out, like trig's change).
3. Update `LearningPage.test.tsx`: `.learning-family` / `.learning-topic-heading` 25 -> 26; thumbnails stay 24 (add comment: analytic-lines has no poster yet).
4. `just unit` the unit set; fix the authoredChapterCoverage reference count, familyChapters word count (450/language), notation test findings.
5. Write `src/graphs/lines/LineGeometryLessonActions.host.test.tsx` (template `src/graphs/trig/UnitCircleLessonActions.host.test.tsx`; mount like `LineGeometryGraph.test.tsx` `mountGraph`; control equivalence: `set-points` vs typing in fields "Točka P, koordinata x" via `enterNumber`, `set-mode` vs the "Prikaz" select; one synchronous multi-action sequence; invalid actions (unknown handle, 9, 1.5, NaN, empty points, bad mode, unknown operation) leave `graph.state` unchanged; `supportsLessonAction`; restore on exit returns the free state). Show failing first by commenting out `registry.on("lines", ...)`.
6. Write `src/learning/content/analyticLinesGuidedLessons.test.ts` (template `trigUnitCircleGuidedLessons.test.ts`; lessons via `getChapterOwnedLessons('analytic-lines').lesson(section)`). Bind each quoted value to step and row: L1 s1 `x − 2y = −4`, raw `3x − 6y = −12`, explicit `y = (1/2)x + 2`, intercepts -4 and 2; s2 Q=(4,-1) raw `−2x − 6y = −2`, `x + 3y = 1`, `y = −(1/3)x + 1/3`; s3 vertical `x = 3`, no explicit; s4 Q=(4,-2) `x + 2y = 0`, `y = −(1/2)x`, no intercept form; s5 P=(-4,0) raw `4x − 8y = −16`, reduced `x − 2y = −4`. L2 s1 R=(3,-2),S=(5,-2): n1 (1; −2), n2 (0; 1), cross 1, dot −2, neither; s2 S=(2,0): `2x + y = 4`, cross 5, dot 0, slopes −1, perpendicular; s3 vertical/horizontal: cross 1, dot 0, no slope product, perpendicular; s4 R=(3,0),S=(5,1): `x − 2y = 3`, cross 0, dot 5, slopes 1/4, parallel; s5 R=(0,2),S=(2,3): same, cross 0, dot 5. Recompute with integer arithmetic; verify the real row strings by running (formats above are predicted from the formatters, unobserved). Show failing first (change one quoted number).
7. `docs/localization.md` terms: implicitna, eksplicitna, odsekovna oblika, normalni vektor, smerni vektor, skalarni produkt, lega premic (those used); task `04-batch-a-lessons.md` status (F3 done) and README row.
8. Sweeps (`BEZEG_TRANSIENT_STATE`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN` = `line-geometry`), `npx vite build --outDir .command-logs/f3-lines-a/site`, `just smoke-lesson line-geometry --port 4461`, then `just check-changed` in the background (read log tail).

## Doubts
- Windows CRLF: new files were written with LF; check git `autocrlf` warnings are only informational.
- Step texts quote readout values predicted from `lineGeometryModel.ts` formatters; the step 2 intercept row is predicted `x/1 + y/(1/3) = 1`.
- Spec text names slope prediction in step 1 but the readout already shows it (same pattern as TR1 step 1).

## Outcome (continuation v13)
- tsc: one error (registrationComposition lesson flag), fixed; then clean (unit set ran type-free; full tsc rerun is part of check-changed).
- Fixed: `registrationComposition.test.ts` (no row opts out), `LearningPage.test.tsx` (26 families/headings, thumbs 24), `LearningPage.tsx` gained a `topicPreviews['analytic-lines']` row (without it the page crashed; no poster so no thumbnail), `authoredChapterCoverage.test.ts` reference count 137 -> 139.
- Unit set green (`unit2.log`). New tests: `src/graphs/lines/LineGeometryLessonActions.host.test.tsx` (5 tests; with `registry.on("lines")` commented out all 5 fail: UnsupportedLessonActionError) and `src/learning/content/analyticLinesGuidedLessons.test.ts` (9 tests; changed dot, quote and implicit value each failed with the expected diff). Real readouts matched the note's predictions and the lesson text; no lesson text change needed. L2 step 5 scene coincides (`relation=premici sovpadata`), text says so.
- Terms added to `docs/localization.md`; task 04 and README row set to F3 done pending handler review.
- Sweeps (line-geometry, three env vars): 10 passed 5 skipped. `vite build` ok, `just build` ok, `just smoke-lesson line-geometry --port 4461`: 2 passed (sl, en 390x844).
- check-changed: log `.command-logs/f3-lines-a/check-changed.log` (see final report for result).
- check-changed: 9750 passed, 1 failed (projectiveConicsChapter order test, fixed and rerun green); tests/unified-learning.smoke.spec.cjs lists analytic-lines; typecheck+lint rerun separately.
