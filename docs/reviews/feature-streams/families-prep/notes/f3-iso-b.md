# F3 isometries Batch B, slice 1 (L3 action and content)

## Written
- `src/learning/model.ts`: `set-dilation` (optional `centre`, `k`, `turn`) in the `isometry` union; comment updated.
- `src/graphs/isometry/IsometryGraph.tsx` `applyIsometryAction` case `set-dilation`: validates all named fields first (centre integers in [-16,16]; k multiple of 1/4, 1/4<=|k|<=4; turn in `DILATION_TURNS`; at least one field), never snaps, writes only changed fields in one `setState`, none if nothing changed.
- `IsometryLessonActions.host.test.tsx`: 4 tests (control equivalence, only-changed writes and unchanged identity, one synchronous sequence, invalid actions incl. valid-before-invalid).
- `src/learning/content/isometriesGuidedLessons.ts`: L3 (5 steps, 1 worked example at step 4), `isometryDilationLesson`, `isometryDilationSceneActions`.

## Observed
- `just unit src/graphs/isometry`: passed (host.log). Red: case renamed, 3 of 4 new tests failed (host-red.log; the invalid-data test still passes as the default branch throws); restored.
- `just unit src/learning/content/isometriesGuidedLessons`: passed. `tsc --noEmit`: clean (tsc.log). Backslash count 0 (backslash.txt). Probe: probe.txt (sl and en).

## Numbers per step (probe, centre (1,1), motif (0,0),(4,0),(0,3))
1. k=3/2: image-1 (-1/2,-1/2), fixed (1,1).
2. k=3: ratios 3 and 9, area 6 -> 54, isometry no.
3. k=-1/2: image-1 (3/2,3/2), ratios 1/2, 1/4, orientation kept.
4. k=3/2 + pythagorean: fixed (1,1), 3/2, 9/4, image-1 (13/10,-11/10).
5. k=-1: isometry yes, image-1 (2,2); k=1: fixed "every point".

## Deviations
- Step 2 uses k=3 (not 3/2) so the worked-example-free prediction (area ratio) is not answered earlier; the spec's 3/2 area numbers are not quoted.
- Spec's 5 -> 7.5 side and k=-1/2 other vertices not quoted (readouts show only vertex 1).

## Still to do (slice 2)
Chapter section, registry, ownership, test lists (notation test, content readback test), smoke, `lesson` flag.

## Doubts
- Step 2 and 5 explanations state/hint rules ("not an isometry unless |k|=1" in step 2 before step 5's find-k prompt); review should judge.
- Step 5 scene opens at k=-1, already showing "isometry yes".
- `lessonMathNotation.test.ts` not run on L3 (lesson not yet listed).

## Slice 2: chapter join and wiring

### Written
- `isometriesChapterRegistry.ts`: section `dilation-similarity` (Demonstration `isometries`), lesson id `isometries-dilation`.
- `isometriesChapter.ts`: section `dilation-similarity` (4 paragraphs sl/en, formula, example; own example k=-2 at centre (0,0), no lesson-step number quoted; 6.32 called approximate); header comment updated.
- Test lists: `familyChapters.test.ts` (isometries 2 -> 3), `authoredChapterCoverage.test.ts` (164 -> 165), `lessonMathNotation.test.ts` (L3 in set and expected ids), `tests/unified-learning.smoke.spec.cjs` (isometries 3). `chapterOwnedLessons.ts`, `guidedExamplePreviewCopy.ts`, ownership, lookup and catalog tests needed no change (isometries already owned; no new Demonstration).
- `docs/localization.md`: terms središčni razteg, razmerje raztega, podobnost, razmerje dolžin/ploščin, polobrat (handler-unreviewed). Task 06 status and README row 06: "F3 in progress".

### Outcome
- tsc clean (s2-tsc.log). Backslash count 0 (s2-bs.cjs). `just unit src/learning src/graphs/isometry`: passed (s2-unit2.log). `just build`: passed. `just smoke-lesson isometries`: passed.
- Red evidence: an earlier overlapping run (s2-unit.log, two runs wrote it, so only partly reliable) with the test lists edited but the section not yet valid showed "expected 2 to be >= 3" and "164 vs 165"; not a clean per-edit red run. The notation test list edit has no separate red run.

### Not verified
- Clean red runs per test-list edit; the full chapter smoke (`unified-learning.smoke` isometries >= 3 minimum edited, not run); sl prose not reviewed by a native speaker.

## Slice 3: review fixes and tests

- Fixes in `src/learning/content/isometriesGuidedLessons.ts`: similarity formula no longer says the centre stays fixed (the dilation formula keeps "The centre is fixed"); `l3-ratio` explanation lost "not an isometry unless |k|=1"; `l3-free` scene opens at k=2 (centre (1,1), turn r0), expected state "isometry no, ratio of areas 4, image of vertex 1 (-1,-1)", readout probed by the content test (isometry ne/no); `l3-similarity` observations say 13/10 and -11/10 without "approximately"; the `l3-similarity` purpose no longer states that the centre does not move; edge case k=0 now "polje ga ne sprejme" / "the field does not accept it".
- Summary: `GuidedLesson.tsx:570` shows it at step 0 before any step, so the negative-k half-turn sentence was removed from the summary (it stays in step 3's observations).
- Tests: L3 block in `isometriesGuidedLessons.test.ts` (sl and en real-graph scenes out of order and twice, exact-fraction recomputation, parity, prediction ordering, delimiters, ownership). Green: `s3-unit.log` (6 files, 79 tests). Red: `s3-content-red.log` (6\mapsto54 changed to 55, failed, restored). `s3-tsc.log` empty; backslash counter 0.
- Not run: sweeps, build, smoke. Host test and smoke spec still quote the old l3-free scene (k=-1) if they assert it; not checked here.

## Handler review (handler 14)
- Sonnet review of slice 1 (`.command-logs/f3-iso-b/review.md`, exact-fraction `check.js`): every number confirmed; 1 blocking (the similarity formula's explanation answered step 4's prediction that the centre stays fixed), 5 non-blocking. Slice 3 fixed all six; the lesson summary is rendered before step 1 (`GuidedLesson.tsx`), so its half-turn sentence was removed.
- Handler read of the L3 explanations, formula ids and the worked example: no remaining answer before its prediction.
- Seen, not in scope: several Batch A steps (L1, L2) state the answer in the explanation (for example L1 step 3 gives the 90° rotation and the image). Owed to a later content pass on the published lessons.
- Checks (`.command-logs/f3-iso-b/h-*.log`): `just unit src/learning src/graphs/isometry`, the six sweeps set to `isometries` with `just unit src/graphs/base src/learning/runtime`, `just check-changed` (with build) and `just smoke-lesson isometries` all passed.
- Spec deviations recorded as F3 Batch B decisions in the spec.
