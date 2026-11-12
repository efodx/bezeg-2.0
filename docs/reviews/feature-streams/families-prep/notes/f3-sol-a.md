# F3 solids, Batch A (SV1, SV2): slice 1 note (worker)

## Written
- `src/learning/model.ts`: `LessonAction` entries `solids`: `set-solid` (`solid`), `set-mode` (`mode`), `set-plane` (`normal`, optional `offset` in grid units 1/4), `set-offset` (`offset`), `set-camera` (`view` preset name). No shear, discs, cursor or axis yet (Batches B, C).
- `src/graphs/solids/SolidsGraph.tsx`: `applySolidsAction`, `refuseUnknown`, `commitSolids`, `registerLessonActions` (`registry.on('solids', ...)`). `set-solid`/`set-mode` go through `withSolid`/`withMode` like the choosers and reframe the camera; merged state is validated by `parseSolidsState`; throws `solids <op>: <field> <reason>.`; unknown fields refused; exhaustive `never` switch; only changed fields written.
- `src/graphs/solids/solidsScene.ts`: `axialSection` (exported); in section mode for `square-pyramid` the polyline `axial` (triangle through the plane y=0, role construction) and, for a horizontal plane strictly between base and apex, `axial-chord` (role construction-2). Test added in `solidsScene.test.ts`.
- `src/graphs/solids/SolidsLessonActions.host.test.tsx` (7 tests): each action equals the chooser or graph control, one synchronous multi-action sequence, checkpoint restore, `supportsLessonAction`, 28 invalid actions change nothing, messages.
- `src/learning/content/solidsGuidedLessons.ts`: `cubeSectionsLesson` (SV1, 6 steps), `prismPyramidSectionsLesson` (SV2, 6 steps), `solidsSceneActions`, scene constants, 2 formula blocks, 2 worked examples. Text via `text()` helper.

## Observed
- Red: registration commented out and axial polyline push commented out: 8 failed (7 host + 1 scene), `.command-logs/f3-sol-a/red.log`; restored; `just unit src/graphs/solids` green (`green.log`), earlier `unit1.log` (solids + src/solids: 1 failure, a -0 in the chord z, fixed).
- `npx tsc --noEmit --pretty false` clean (`tsc2.log`, empty). Single-backslash scan: 2 hits, both the `text()` regex on line 14 (legit); 0 in prose (`bscheck.log`).
- Probe outputs: `probe.txt`, `probe2.txt` (the cube scan in probe2 is invalid for the pyramid: the solid had been left on cube; ignore its max-sides line); `probe6.txt` (pyramid, all normals -4..4, D -48..48: 0 sections with more than 5 sides). Probe tests deleted.
- Not run: `lessonMathNotation.test.ts` (module not in its list), content test, chapter, smoke, `just lint`, any browser look (the axial triangle in the front view is unseen).

## Numbers per step (probed readouts, sl; offset d = D/4 as the slider shows)
SV1 (unit cube, edge 1 = spec unit cube, mapping 1:1): 1 (0,0,1) d0,5: 4 sides, area 1, kept 0,5; d0,25 kept 0,25. 2 (1,1,0) d1: 4, 1,41421, vertices 2,3,7,6; (1,2,2) d1,5: 4, 0,75, edges 1-5,2-6,2-4,1-3, kept 0,13542. 3 (1,1,1): d0,5 3/0,21651; d1 3/0,86603 (vertices 2,3,5); d1,25 6/1,19078; d1,5 6/1,29904 kept 0,5; d2 3/0,86603; d3 point (vertex 8). 4 d1,25 corners edges 3-7,5-7,5-6,2-6,2-4,3-4. 5 (2,3,4) d4 5/1,2341 (vertex 5 + 4 edges); d4,5 6/1,2902.
SV2 (prism 2x2x3 vol 12; pyramid base 4x4 at z=-2, apex z=2, vol 21,33333): prism (0,0,1) d-1,0,1: 4/4, kept 2,6,10. Pyramid d-1: 9; d0: 4; d1: 1; d-2: 16; d2: point (vertex 5). Apex: (1,0,0) d0 3/8; (1,1,0) d0 3/11,31371; (1,2,1) d2 3/4,89898; (1,0,1) d2 point. (1,1,1): d-1,75..1,75 probed at -1,75 -1,5 -1 -0,5 0 0,5 1 1,5 1,75 all 5 sides; d0 area 8,66025 kept 15,33333; d-2 3/6,9282; d2 segment; d-1 9,09327. (2,3,4) d0 5/7,78076; (1,1,2) d0 4/6,53197.

## Learner actions
Mode and Solid choosers, three Normal sliders (x,y,z), Plane offset slider (step 0,25), camera buttons Spredaj/Zgoraj/S strani/Izometrično.

## Still to do
- Slice 2: chapter skeleton, registry, wiring, `lesson: false` removal from the solids row, notation test list, smoke rows. Slice 3: content test (recompute numbers independently), sweeps, smoke, review of the text.
- The panel caption list has no entry for the drawn axial triangle: add a caption key (sl.ts/en.ts in lockstep) and show it for the pyramid in `SolidsPanels.tsx` (not my paths).

## Doubts
- Slovenian text unreviewed by a second reader; one sentence in SV1 step 3 explanation (`Šestkotnik pri 1,5 razloži izračun v zgledu`) was patched last, recheck it.
- SV2 step 3 asks to estimate the segment by eye in the front view; not seen in a browser.
- `set-solid` takes a `string` in the union so invalid ids reach the parser (tested), not a typed id.
- SV1 step 3 does not quote d=2,25 (not probed); the prompt grid values are all probed.

## Slice 2: chapter skeleton and wiring (worker)

### Written
- New `src/learning/content/solidsChapterRegistry.ts` (id `solids`; sections `cube-sections`, `pyramid-sections`, both on `solids`; lesson ids `solids-cube-sections`, `solids-pyramid-sections`) and `solidsChapter.ts` (family `analysis`, *Telesa in prostornine* / *Solids and volumes*, two sections of four paragraphs plus formula and example, prerequisite link `analysis#integrability`). Numbers in the prose are the probed ones of the lessons.
- Wiring: `chapterOwnedLessons.ts`, `familyChapters.ts` (entry directly after the analysis chapter, before `recursionChapter`), `guidedLessonOwnership.ts` (`'solids'` -> solids/cube-sections; SV2 derived), `LearningPage.tsx` (topicPreviews entry, alt text only; strand `functions` now `... analysis, solids, recursion, phase-portraits ...`), `guidedExamplePreviewCopy.ts` (`'solids'`), `graphs/solids/registration.ts` (`lesson: false` removed, comment updated).
- Caption: key `solids_graph_caption_axial` in `sl.ts`/`en.ts` (after `solids_graph_caption_corner`); `SolidsPanels.tsx` `axialCaption(solid)` appended in section mode for `square-pyramid` only (also when the plane misses the solid, since the triangle is drawn then too); `captionKeys` gained a `solid` parameter. Test in `SolidsGraph.test.tsx` (cube none, pyramid shown with sl text, still shown when plane misses, prism none). `docs/localization.md`: one row (osni presek etc., handler-unreviewed).
- Tests: `registrationComposition.test.ts` (no row opts out; comment), `familyChapters.test.ts` (id list, minimum 2, `CHAPTER_LINK_PENDING` without `solids`), `numericalChapter.test.ts` (analysis + 3 -> + 4), `LearningPage.test.tsx` (36 -> 37), `authoredChapterCoverage.test.ts` (37 chapters, references 158 -> 160, `solids.<section>.solids`), `lessonLookup.characterization.test.ts` (lessonless list without `solids`; rows SV1, SV2), `runtime/lessonCatalog.test.ts` (lessonless list), `lessonOwnerIntegrity.test.ts` (+`solids`), `lessonMathNotation.test.ts` (set entry, two `'solids'` ids).
- Smoke: `tests/guided-lessons.smoke.spec.cjs` row `solids` (6 steps, minFrames 13 = 6 x 2 + 1 calculation frame, route `/analysis/solids`, in LESSONS; SV2 no row); `tests/unified-learning.smoke.spec.cjs` chapter list + minimum `'solids': 2`.
- Notation exception in `solidsGuidedLessons.ts`: not needed, no edit.

### Outcome
- Red: caption test with the pyramid caption neutered: 1 failed, 54 passed (`s2-red.log`); restored.
- `npx tsc --noEmit --pretty false`: clean (`s2-tsc.log`, empty).
- `just unit src/learning src/graphs/solids`: 155 files, 2434 tests passed (`s2-unit.log`, underlying log named there).
- `just build` passed (`s2-build.log`); `just smoke-lesson solids` passed, 2 tests (sl walk, en narrow) (`s2-smoke.log`).
- Counts: chapters 36 -> 37; authored references 158 -> 160; lessonless Demonstrations 7 -> 6 (`complex-power, complex-euler, triangle-solver, recursion-cobweb, phase-portrait, contour-map`); numerical index analysis + 3 -> + 4; solids chapter at analysis + 1.

### Not verified
Learn page and chapter page in a browser, the axial caption in a browser, `just lint`, full smoke checklist, `just check`, Slovenian chapter prose and the term *osni presek* by a native reader; Learn thumbnail absent (media slice).

## Outcome (slice 3) - PARTIAL (budget handoff)

### Review findings fixed (`src/learning/content/solidsGuidedLessons.ts`, `solidsChapter.ts`)
- Blocking 1 sv1-tilt: explanation and en no longer reveal sides/area; it asks (square? sides? area?) and points to the observation that follows.
- Blocking 2 sv1-diagonal: explanation no longer names the hexagon or the worked example; expectedState no longer names the hexagon/area at 1,5; the hexagon mention moved to expectedObservations (shown after the prediction).
- Blocking 3 sv1-argument: explanation only asks (max sides, then try to find a heptagon); title now "Najvecje stevilo stranic" (no longer "Sedemkotnika ni"); the argument (with the coplanar-face case) moved to expectedObservations.
- Non-blocking: grammar "so 4 stranice in ploscina je spet 1"; oglisce for vogal; step 4 title "ležijo na robovih ali v ogliščih"; "priblizno"/"approximately" on every irrational area (steps 3, 4, 6 and scene lines); no "SV1" in prerequisites; coplanar-face case in sv1-argument and in the sv2-pentagon explanation; sv2-apex prompt no longer hands base/height (asks for shape and area, read base and height from the axial section).
- Chapter prose (solidsChapter.ts): found and fixed a false claim ("with normal (0,0,1) the plane meets only parallel faces": it meets the four lateral faces, for 0<d<1); added the coplanar-face case to the argument.
- Prerequisite link `analysis#integrability`: section id exists in `familyChapters.ts:379`; asserted in the test.

### Tests added
- `src/learning/content/solidsGuidedLessons.test.ts` (12 tests, all green: `s3-content3.log`): both-language scene sweep (twice, out of order, real graph), independent recomputation (polytope section + hull area, clipped-square slicing volume, |n| dV/dd, pyramid by similarity), quoted numbers in sl/en, prompted configs on grid and vs graph readouts and corner rows, no-answer-before-prediction checks, approximate/oglisce/no-SV ids, backslash source scan, worked examples, chapter prose, ownership.
- Red: sl "11{,}31371" changed to "...72" in sv2-apex: 1 failed (`s3-content-red.log`); restored, green.

### Checks run
- `npx tsc --noEmit --pretty false`: clean (`s3-tsc.log`, empty).

### Not run (budget handoff)
`just lint` on changed files, `just unit src/learning src/graphs/solids`, the six BEZEG_* sweeps with `solids` and `just unit src/graphs/base src/learning/runtime`, `just build`, `just smoke-lesson solids`, final node backslash counter. Also not verified: browser look; Slovenian wording by a native reader; expectedState of other steps (tilt, parallel) still names readouts, but no view renders expectedState (only expectedObservations are shown, GuidedLesson.tsx:450-454); the worked-example calculation frame still shows the hexagon after the explanation and before the observation frame (step order fixed by `step()`).

## Handler review (handler 13)
- Sonnet mathematical, language and engineering review of slice 1 (`.command-logs/f3-sol-a/review.md`): every number recomputed independently (`rev.cjs`), axial-triangle geometry confirmed, engineering clean. Three blocking findings, all answers shown before their prediction (sv1-tilt, sv1-diagonal, sv1-argument), fixed in slice 3 with the eight non-blocking ones; slice 3 also found a false chapter claim (the horizontal plane meets the four lateral faces).
- Handler fixes after slice 3: the hexagon worked example moved from the diagonal step to the corners step, because the calculation frame shows before the observation and gave away the d = 1,5 answer; the pyramid pentagon step title no longer states "up to a pentagon". The lesson summaries keep the learning goal, as in the other families.
- Checks after the handler fixes (`.command-logs/f3-sol-a/h-*.log`): six sweeps set to `solids` with `just unit src/graphs/base src/learning/runtime` passed (68 files; the sweeps reject unknown ids, none rejected); content and notation tests passed; `just check-changed` (tsc, lint, affected unit, build) passed; `just smoke-lesson solids` passed; node counter: 0 single-backslash delimiters in the lesson and chapter files.
- Spec deviations recorded as F3 Batch A decisions in the spec. Owed to F4–F6 of task 05: no browser look at the chapter page, the axial triangle or its caption; the Slovenian prose has no second reader; the corner vertex numbers in the content test come from the probe; the cube offset phone items.
