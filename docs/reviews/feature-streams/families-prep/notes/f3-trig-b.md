# F3 trig batch B (TR3, TR4), slice 1 - PARTIAL (budget signal)

## Written
- `src/learning/model.ts`: new action kind `triangle` (`set-mode` sides|circle|solve; `set-vertex` vertex + integer x in [-2,8], y in [-7,11]). Own kind (not `trig`) so each graph's switch stays exhaustive; `trig` comment updated.
- `src/graphs/trig/TriangleSolverGraph.tsx`: `applyTriangleAction` (refuseUnknown, strict range, `parseTriangleState`, `never` switch, writes only changed fields, vertex goes through `setVertex` like the field) + `registerLessonActions`. Registration row still `lesson: false` (slice 2).
- `src/graphs/trig/TriangleSolverLessonActions.host.test.tsx`: 9 tests.
- `src/learning/content/trigTriangleGuidedLessons.ts`: `sineRuleLesson` (TR3), `cosineRuleLesson` (TR4), 7 steps each, sl+en, `triangle-solver` Demonstration; exports `triangleSceneActions`.

## Observed
- Host: green (`host.log`); red with registration disabled: 9 of 9 failed, UnsupportedLessonActionError (`host-red.log`); restored.
- tsc: see `tsc.log` (an earlier run showed one TS2345 in the host test's `test.each` table; fixed by dropping two stray columns, rerun result in tsc.log, host test NOT rerun after that edit).
- Single-backslash delimiters in lesson file: 0 (`backslash.txt`).
- Probe (`probe.txt`, temp test deleted): default, C=(6,5), C=(-1,3), C=(3,8), circle default, C=(-1,3)/(-2,2) obtuse, right at A, right-C triangle, (1,1), (-1,-1), grid, numeric, explore, explore-right.

## Numbers per step (probed)
TR3: default 2R 7,15891 (ratios equal), R2 205/16, O (7/2,3/4), A' (0,3/2), thales 0, apex 63,4349; C=(6,5) ratios 7,96492; C=(-2,2) A=135, apex 45, 2R 13,0384, R2 85/2; right A (0,0),(4,0),(0,3): 2R=5, apex none. TR4: default 49=41+20-12, dot 6; right (4,0),(0,3),(0,0) 25=9+16-0; C=(1,1) -10 (135 deg), C=(-1,-1) 18 (64,6538); grid (0,0),(6,2),(1,4) 40=29+17-6; numeric (6,0),(0,0),(2,3) c=6, correction 2, C 86,8202; explore (1,2) correction 2, (2,2) right.
Arithmetic (not probed, node): sin A 0,894427, 7,15891*0,894427 = 6,40312; cos C = 6/sqrt(820) = 0,2095.

## Learner actions
Each scene: set mode, type vertex x/y fields (grid -2..8, -7..11), drag.

## Still to do
1. Not probed, quoted in text: C=(2,-2) right angle (TR4 explore); collinear status text (TR3 explore, from sl.ts line 744) and "no correction" for flat triangles (TR4 edge case). Probe or soften.
2. Rerun `just unit src/graphs/trig/TriangleSolverLessonActions` after the table fix; `just unit src/graphs/trig`.
3. Slice 2: chapter join, registration (`lesson: false` off), smoke rows, notation test list entries (`lessonMathNotation.test.ts`), preview copy. Slice 3: content test reading scene readouts.
4. TR3 text links the inscribed-angle lesson by title only (no id, no link component); slice 2 may add a chapter link.
5. Spec steps (3) circle and (4) diameter are separate steps but the graph draws circle, diameter and auxiliary triangle together in circle mode (step 3 predicts only about 2R).

## Doubts
- `step.scene` expectedState text for step 6 in TR3 says A=135 degrees in the explanation (a given, not the answer).
- Step 5 TR3 prose uses `A^\prime` (rendered A prime); check KaTeX output in the notation test.
- TR4 step 1 states Pythagoras in the explanation (known prior result).

## Slice 2: chapter join and wiring

Written
- Host test `TriangleSolverLessonActions.host.test.tsx` re-run first: green (`just unit src/graphs/trig`, log `s2-trig-unit.log` path in `.command-logs/f3-trig-b/`), no change needed.
- `trigonometryChapterRegistry.ts`: sections `sine-rule`, `cosine-rule` on `triangle-solver`, lesson ids `triangle-sine-rule`, `triangle-cosine-rule`. `trigonometryChapter.ts`: two sections (four paragraphs, formula, example each), `withExample` gained an optional per-paragraph `links` map; TR3 paragraph 2 links `/bezeg-2.0/learn/triangle-geometry#inscribed-angle` (label "obodni koti" / "inscribed angles"); purpose text and header comment extended.
- `guidedLessonOwnership.ts` row `triangle-solver` -> trigonometry/sine-rule; `guidedExamplePreviewCopy.ts` row; `familyChapters.ts` comment; trig `registration.ts` (`lesson: false` removed for `triangle-solver`) and `registrationComposition.test.ts`.
- Tests: `familyChapters.test.ts` (pending list, trigonometry minimum 4, family check now allows `plane-geometry` for the trigonometry chapter, since the triangle solver belongs to that family), `authoredChapterCoverage.test.ts` (references 160 -> 162), `lessonLookup.characterization.test.ts`, `runtime/lessonCatalog.test.ts` (triangle-solver leaves the lessonless list), `lessonMathNotation.test.ts` (set and expected ids). LearningPage.test counts unchanged (no new chapter). No notation exception needed; the lesson file was not edited.
- Smoke: `tests/guided-lessons.smoke.spec.cjs` row `triangle-solver` (7 steps, minFrames 15 = 7 x 2 + 1 calculation frame, setup waits for >= 3 points); `tests/unified-learning.smoke.spec.cjs` trigonometry minimum 2 -> 4.

Outcome
- `npx tsc --noEmit`: clean (`s2-tsc.log`).
- `just unit src/learning src/graphs/trig`: first run 1 failed / 2453 passed (family check, fixed as above, `s2-unit.log`); `familyChapters.test.ts` rerun passed (`s2-unit-fc.log`). The full folder set was not rerun after the fix.
- `just build`: passed (`s2-build.log`). `just smoke-lesson triangle-solver`: passed (`s2-smoke.log`).

Not verified
- TR4 in the browser (no smoke row by design); unified-learning smoke; Slovenian/English prose reviewed only by tests; preview copy wording against the rendered default state.

## Outcome (slice 3) - PARTIAL (budget signal)

Review items
1. Steps 3 (circle) and 4 (diameter) merged into one step `tr3-circle` (trigTriangleGuidedLessons.ts ~129): three predictions asked in the explanation, observation reads 2R, O, A', dot product, apex angle. TR3 now has 6 steps (orders 1-6); smoke row `triangle-solver` steps 6, minFrames 13 (tests/guided-lessons.smoke.spec.cjs:1407-1408). Chapter quotes no step numbers.
2. English inscribed-angle title now "The inscribed angle and Thales' theorem" (argument step explanation, prerequisites); Slovenian already matched.
3. `A^\prime` replaced by `A′` (U+2032, as the graph prints it) in the lesson file. KaTeX/notation acceptance NOT yet confirmed: lessonMathNotation.test is inside the full `just unit src/learning` run that was still running.
4. Host test 'an unchanged value writes nothing' now spies `graph.setState`: no calls for unchanged mode/vertex, 2 calls for the changed ones. Green `s3-host.log`; red with the two guards in TriangleSolverGraph.tsx (lines 727, 498) removed: 1 failed (`s3-host-red.log`); restored.
5. tr4-numeric: exact quantities (a = sqrt13, c^2 = 13+25-2 = 36, correction 2, dot product 1) separated from the rounded angle C; stated explicitly.
6. New `src/learning/content/trigTriangleGuidedLessons.test.ts`, 16 tests, green (`s3-content.log`): both-language scene sweep on real graph (out of order, twice), prompted placements, grid, independent maths, number quoting, sl/en number parity, prediction ordering, backslash scan, worked examples, chapter prose, ownership, link anchor. Red: one sl number 7,15891 -> 7,15892 failed 2 tests (`s3-content-red.log`), restored.
Also fixed: en text of tr3-obtuse now says "adding up to 180" (sl/en number parity).

Checks done: `npx tsc --noEmit` clean (`s3-tsc.log`).
Not run / not verified: `just unit src/learning src/graphs/trig` (started, result unread, log `s3-unit.log`), six sweeps, `just unit src/graphs/base src/learning/runtime`, `just build`, `just smoke-lesson triangle-solver` (row changed to 6 steps), node backslash counter (the content test's source scan passes), notation test with A′.

## Handler review (handler 13)
- Sonnet mathematical, language and engineering review of slice 1 (`.command-logs/f3-trig-b/review.md`): 0 blocking, 6 non-blocking; every number recomputed independently (`check.js`); the three claims slice 1 left unprobed (right angle at C = (2,−2), the collinear status text, no correction for flat triangles) confirmed against the graph. Slice 3 fixed all six: TR3 circle and diameter steps merged (the circle mode drew step 4's answer in step 3), the inscribed-angle title, `A′` as the graph prints it, a host test that fails when an unchanged value is rewritten, exact and rounded numbers separated in the TR4 numeric step.
- Handler fix: five unused `language` parameters in the content test renamed `_language` (lint).
- Checks (`.command-logs/f3-trig-b/h-*.log`): `just unit src/learning src/graphs/trig` passed; six sweeps set to `triangle-solver` with `just unit src/graphs/base src/learning/runtime` passed; `just check-changed` and `just smoke-lesson triangle-solver` in `h-cc2.log`, `h-smoke2.log`; node counter: 0 single-backslash delimiters in the lesson and chapter files.
- Spec deviations recorded as F3 Batch B decisions in the spec (own action kind `triangle`, the TR3 merge, the TR4 dot-product step in place of the projection step, the chapter spanning two families). Owed to F4–F6 of task 08: no browser look at the circle mode during the lesson or at the chapter link; TR4 has no smoke row (one default row per Demonstration); the Slovenian prose has no second reader.
