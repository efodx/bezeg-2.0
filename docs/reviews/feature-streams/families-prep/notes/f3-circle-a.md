# F3 circle geometry Batch A, slice 1 (worker note)

## Written
- `src/learning/model.ts`: LessonAction `circle` (`set-mode`, `set-circle`, `set-point`).
- `src/graphs/compgeo/CircleConstructionGraph.tsx`: `applyCircleAction` (exhaustive switch, no casts; coordinates via `snapCoordinateInput`, radius via `snapRadiusInput`, `adjusted` means throw; nothing written before validation), `registerLessonActions`. `set-mode` loads `exampleState(mode)` exactly like the mode select (so radical mode starts with P=(4,2)).
- `src/learning/content/circleGeometryGuidedLessons.ts` (CG1 6 steps, CG2 7 steps, sl+en), `circleGeometryChapterRegistry.ts` (sections `tangents-from-a-point`, `radical-axis-and-centre`), `circleGeometryChapter.ts` (links T1 and inscribed-angle sections; T5 `inversion` lesson is released and is named in prose).
- Wiring: `chapterOwnedLessons.ts`, `familyChapters.ts`, `guidedLessonOwnership.ts` (circle-construction -> circle-geometry/tangents-from-a-point), `LearningPage.tsx` (topicPreviews row + strand after analytic-lines), `circleConstruction/registration.ts` (`lesson: false` dropped), `guidedExamplePreviewCopy.ts`.
- Tests touched: `circleConstruction/registrationComposition.test.ts`, `familyChapters.test.ts` (pending list, id order, 27 chapters, min 2 sections), `lessonMathNotation.test.ts` (lesson set + demonstration list).

## Observed
- `npx tsc --noEmit --pretty false`: clean (`.command-logs/f3-circle-a/tsc.log`, 0 lines).
- `just unit familyChapters.test.ts lessonMathNotation.test.ts`: passed (`unit2.log`).

## Numbers per step (readout = graph; calc = plain arithmetic in the same step)
Readout formats: `rat` gives integer or `p/q ≈ 4 decimals`; lines unnormalised (`12 x = 52`).
- cg1-predict (P=(13,0)): power 144, 2 tangents (readout).
- cg1-count (P=(3,0)): power -16, 0 tangents (readout); (5,0): power 0, 1 tangent (user action, calc 0).
- cg1-thales: Thales centre (13/2 ≈ 6,5, 0), squared radius 169/4 ≈ 42,25; contacts (1,9231; ±4,6154); chord `13 x = 25` (all readout, from kernel probe).
- cg1-right-angle: dot product 0 (calc, T1=(25/13,60/13)).
- cg1-lengths: power 144, length 12 (readout).
- cg2-predict (P=(4,2)): powers -5, -1, 13 (probe output); on-axis no.
- cg2-probe (P=(5,2)): powers 4, -4 (calc; c3 power 16 not quoted).
- cg2-line: axis 1,2 `12 x = 52`, x=13/3 (readout); 4,3333 (dec).
- cg2-common: two common points (readout); y=±√56/3 ≈ ±2,4944 (calc, NOT in a readout).
- cg2-apart: c2=(8,0) r3: `16 x = 80`, "one common point"; user sets (10,0) r2: `20 x = 121`, "no common points" (probe output, user action).
- cg2-centre: centre (13/3 ≈ 4,3333, 10/3 ≈ 3,3333), power 44/9 ≈ 4,8889, orthogonal squared radius 44/9, axes `6 x + 12 y = 66`, `−6 x + 12 y = 14` (probe output); radius √(44/9) ≈ 2,2111 (calc).
Probe output was a temporary unit test (removed); values come from `deriveCircleConstruction`.

## Still to do (slice 2)
- Host test for the `circle` actions (copy `LineGeometryLessonActions.host.test.tsx`), content test reading readouts (cg2-apart user-action numbers and cg2-common y values need recomputation with plain arithmetic).
- Test lists not yet touched: `lessonCatalog.test.ts` and `lessonLookup.characterization.test.ts` lessonless lists (remove circle-construction), `lessonOwnerIntegrity.test.ts` AUTHORED list, `authoredChapterCoverage.test.ts` (chapter count, key mapping, reference counts), `LearningPage.test.tsx`, `projectiveConicsChapter.test.ts` (check), smoke rows in `tests/guided-lessons.smoke.spec.cjs` and `tests/unified-learning.smoke.spec.cjs`, `docs/localization.md` terms (potenčna premica, potenčno središče, tetiva dotikališč, Talesova krožnica), task/README status. Sweeps and production build not run.
- Run `just unit` for these and `src/learning/chapter`, `guidedExamplePreviewCopy`, circleConstruction tests (not run by me beyond the two files).

## Doubts
- Slovenian "krožnice z isto potenčno premico" for coaxal circles and "sosrediščni" (taken from sl.ts) unreviewed.
- CG2 step 5 asks the learner to type the disjoint circle themselves; the scene shows the touching case.
- The T5 link is prose only (chapter `prerequisiteLinks` link T1 and inscribed-angle; no T5 link added).

## Outcome (slice 2)
- Written: `src/graphs/compgeo/CircleConstructionLessonActions.host.test.tsx` (5 tests), `src/learning/content/circleGeometryGuidedLessons.test.ts` (13 tests; exact integer/rational recomputation, learner changes cg1-count P=(5,0) and cg2-apart c2=(10,0) r=2 applied as actions). Lists: `lessonCatalog.test.ts`, `lessonLookup.characterization.test.ts` (circle-construction no longer lessonless), `lessonOwnerIntegrity.test.ts`, `authoredChapterCoverage.test.ts` (28 chapters, 143 references), `LearningPage.test.tsx` (28 chapters, thumbnail count unchanged at 24), `projectiveConicsChapter.test.ts` (order: analytic-lines, circle-geometry, projective-conics), smoke rows (`circle-construction`, route is `/circle-constructions`; 6 steps, 13 frames; chapter list and min 2 sections). Docs: `docs/localization.md` (5 terms), task 04 status, README row.
- Red first: host test with the `circle` registration commented out: 5 of 5 failed (`host-red.log`); content test with one quoted number changed (step 6 power 44/9 -> 45/9): 1 failed (`content-red.log`). Both restored.
- Green: host 5/5, content 13/13; `just unit` on src/learning/chapter, content, LearningPage.test.tsx, runtime, src/graphs/compgeo: all passed (after fixing my own reference count 141 -> 143) (`unit-all.log`); tsc 0 lines (`tsc.log`); `just lint` passed (`lint.log`); sweeps (transient state, preset round trip, teardown, lesson restoration, scene content, all = circle-construction) passed, 30 tests (`sweeps.log`); `vite build` and `just build` passed; `just smoke-lesson circle-construction --port 4437` passed after correcting the route (`smoke.log`).
- Not run: `just check-changed`, other smoke ids, English/mobile beyond what the row runs, full sweeps.
- Doubts: the quotes test checks substrings only (whitespace stripped); 42,25 and 6,05 appear in readouts/text only partly (42,25 is not in prose, so it is not asserted there); the Slovenian coaxal terms remain unreviewed.
