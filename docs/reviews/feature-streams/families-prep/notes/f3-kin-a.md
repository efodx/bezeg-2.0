# F3 kinematics Batch A, slice 1 (worker note) - PARTIAL (budget signal)

## Written
- `src/learning/model.ts`: LessonAction kind `kinematics`: `set-motion {motion}`, `set-time {t}`, `set-params {v0?, alpha?, radius?, omega?, b?, showVelocity?, showAcceleration?, split?, trace?}`.
- `src/graphs/curves/kinematics/KinematicsGraph.tsx`: `applyKinematicsAction` (exhaustive `never`, no casts/any; whole new state through `parseKinematicsState` before any write, throws otherwise; writes go through `edit`, which pauses and reconciles the time at once, so `set-motion` then `set-time` in one tick works) and `registerLessonActions`.
- Caption fix (same file): new exported `captionPlacement(axisPx, width)`; captions stand right of the y axis when that side is wider, else left of the tick labels (60 px clear), instead of always at the left edge over the labels. `captionLines(text, room)` now takes the room in px (was board width). Before: captions at left edge + 10 px, over the y-axis tick labels. After: indent/room computed from the pixel position of x = 0. New test `src/graphs/curves/kinematics/captionPlacement.test.ts` (4 tests, NOT run).
- `src/learning/content/kinematicsGuidedLessons.ts`: KN1 `kinematicsVectorsLesson` (6 steps), KN2 `kinematicsSpeedLesson` (7 steps), sl+en, helpers `kinematicsSceneActions`. Not imported by any wiring yet except the new registry.
- `src/learning/content/kinematicsChapterRegistry.ts` (chapter id `kinematics`; sections `position-velocity-acceleration`, `speed-and-parametrization`, both on `curve-kinematics`; lesson ids `curve-kinematics-vectors`/`-speed`). Not yet imported anywhere.

## Observed
- `npx tsc --noEmit --pretty false`: 0 lines after all of the above (`.command-logs/f3-kin-a/tsc3.log`). No unit test run at all.

## Numbers per step (from formulas by node; NOT yet checked against the running graph)
KN1 (cycloid): s1 t=0 arrows off r=(0; 0); s2 t=pi/2 arrows off r=(0,571; 1); s3 v only: v=(1; 1), |v|=1,414; s4 t=pi both: v=(2; 0), a=(0; -1); s5 t=0 both: v=(0; 0), |v|=0, a=(0; 1); s6 t=pi/2 both.
KN2 (circular R=1, omega=1, b=0,5): s1 t=0 r=(1; 0); s2 t=1,1206 r=(0; 1) (time readout 1,12); s3 t=0 v only: v=(0; 1,5), |v|=1,5; learner: slider 1,57 -> |v| 1, 3,14 -> 0,5; s4 t=1,1206: v=(-1,218; 0); s5 split t=pi/2: aT=-0,5, aN=1, kappa=1; s6 split t=pi: |v|=0,5, aN=0,25, kappa=1, kappa|v|^2=0,25, aT reads 0; s7 t=pi/2 both arrows.

## Learner actions the text asks for
KN1: premakni drsnik / Predvajaj (s2); izberi drugo gibanje v seznamu Gibanje, premikaj cas (s6). KN2: pritisni Predvajaj ali premakni cas (s2); postavi drsnik casa na 3,14 in 1,57 (s3); spreminjaj b od 0 do 0,9 (s7).

## Slice 1b (wiring, tests, readout probe)
- Written: `kinematicsChapter.ts` (2 sections, 4 prerequisite links); wired in chapterOwnedLessons, familyChapters (after curve-geometry, before patches; `patchChapter.test` adjacency updated), guidedLessonOwnership (`curve-kinematics` -> first section), LearningPage (topicPreviews + strand `curves` after `curve-geometry`), guidedExamplePreviewCopy, kinematics registration (`lesson: false` dropped) and its registrationComposition test; test lists (familyChapters, LearningPage, authoredChapterCoverage 30/147, lessonMathNotation, lessonOwnerIntegrity, lessonCatalog, lessonLookup.characterization); smoke specs (guided-lessons default row `curve-kinematics`, 6 steps, minFrames 13; unified-learning chapter list + min sections 2). Smoke specs NOT run.
- Readout probe (temporary test mounting the real KinematicsGraph, applying each step's scene actions; deleted): ALL quoted numbers matched, no prose change. KN1 t=0 r=(0;0) v=(0;0) a=(0;1), "ni smeri" status; t=pi/2 r=(0,571;1) v=(1;1) |v|=1,414; t=pi v=(2;0) a=(0;-1) a-t 0. KN2 (R=1, omega=1, b=0,5): t=0 r=(1;0) v=(0;1,5) |v|=1,5 aN=2,25; t=1,1206 time shows 1,12, r=(0;1), v=(-1,218;0); t=pi/2 aT=-0,5 aN=1 kappa=1 speed 1; t=pi |v|=0,5 aN=0,25 kappa=1 kappa v^2=0,25 aT=0. Learner values: slider 1,57 -> |v| 1, 3,14 -> 0,5 (aT reads -0,001 because 3,14 != pi; text says approximately 0, fine). b=0,9: t=pi |v|=0,1.
- Checks: `tsc --noEmit` 0 lines (`.command-logs/f3-kin-a/tsc4.log`); unit logs `.command-logs/f3-kin-a/u-*.log`.

## Still to do
1. Next slice: host tests for the three actions, content test recomputing the quoted numbers against the real readouts (the probe values above are the expected table).
2. Smoke run of the new rows (not done); browser check of the caption placement.

## Doubts
- The graph has no speed-versus-time graph and the reference point has no readouts; KN2 step 3 replaces the spec's "speed graph" by speed readouts at three times and states the reference speed (1 m/s) from the formula. Spec step 3 / arc length readout (6,283) are prose only (arc length is not a readout).
- Caption placement is unit-level only; not seen in a browser. With the axis near the board middle (cardioid, rose, spiral, circle) the captions get about half the width and wrap more; CAPTION_ROOM was not enlarged.
- KN1 s1 predict prompt says "horizontally forward or vertically up" (answer in s5: vertically up).
- Slovenian text unreviewed; the sl sentence "stanje pove, da je hitrost 0" mirrors `kinematics_graph_status_cusp`.

## Outcome (slice 2)
- Tests added: `src/graphs/curves/kinematics/KinematicsLessonActions.host.test.tsx` (6 tests: each action equals the matching input; set-motion, set-time, set-params in one tick; strict rejection; supportsLessonAction; restore) and `src/learning/content/kinematicsGuidedLessons.test.ts` (10 tests: expected rows recomputed from the closed-form cycloid and circle, quoted numbers generated from them and looked up in sl and en, scenes out of order and twice, learner actions, restore).
- Red/green: host green `.command-logs/f3-kin-a/host-green.log`; with the `registry.on("kinematics", ...)` line commented out all 6 fail (`host-red.log`), restored (cmp-verified). Content green `content-green.log`; with the sl "0,571" in kn1-trace changed to "0,572" the quote test fails (`content-red.log`), restored (cmp-verified).
- Observed: `set-motion` to the motion already shown (cycloid on cycloid) keeps the time, like choosing it in the list; every other motion change resets it to 0. Not a bug, only the doc sentence "time restarts at 0" is true for a real change.
- Checks (logs `.command-logs/f3-kin-a/`): `just unit` src/learning/content, src/learning/chapter, src/graphs/curves pass (`final-*.log`); `tsc` 0 lines; `just lint` pass; six sweeps with `curve-kinematics` pass (`sweeps.log`, `sweeps-content.log`; 105 passed, 16 skipped placeholders); `vite build` ok (`build.log`); `just smoke-lesson curve-kinematics` 2 passed (sl and en 390x844), `curve-parametric curve-curvature` 4 passed, no row fix needed.
- Screenshots `caption-1280x800.png`, `caption-390x844.png` (script `shot.cjs`): captions stand right of the y axis, clear of the tick labels; at 390 px they wrap to 7 lines, the last ones close to the curve apex at x = 0 to 1.
- Docs: localization.md five rows; task 04 and README row 04 say F3 done.

## Handler review (handler 11)
- Sonnet mathematical and engineering review: numbers recomputed (cycloid, KN2 circle with angle \(t+b\sin t\), arc length \(2\pi\), quarter turn at \(t=1{,}1206\)); engineering cleared.
- Fixed after review: the cusp list in `kn1-explore` (only the cycloid at \(t=0\) and \(2\pi\) and the cardioid at \(t=\pi\); the spiral has no cusp at \(t=0\)); `kn2-speed` says that \(3{,}14\) is only approximately \(\pi\); `kn2-tangent` says the reference point reaches the top only at \(t=\pi/2\); `captionPlacement` keeps the captions short of the tick labels when the axis is less than 60 px beyond the right edge (new test case).
- Accepted: the 100 px minimum caption room on very narrow boards. Screenshots `.command-logs/f3-kin-a/caption-*.png`: the captions clear the tick labels; at 390×844 they wrap to seven lines above the curve. That wrap is owed to the F6 layout check of this batch.
