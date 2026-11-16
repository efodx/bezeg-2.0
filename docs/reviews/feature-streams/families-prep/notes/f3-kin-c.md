# F3 kinematics Batch C (KN5), slice 1: osculating circle and opening probe

## Written
- `src/kinematics/kinematicsModel.ts`: stored toggle `osculating` (default false); the strict parser reads a missing field as false (old Presets), a non-boolean is refused.
- `src/graphs/curves/kinematics/KinematicsGraph.tsx`: tangent and normal axes (two thin dashed lines, shown while `split` and the point is regular), the osculating circle (`osculatingCircleNow()`: radius 1/|kappa|, centre on the left normal / kappa; hidden at a cusp, at kappa = 0 and above 2 board-frame sizes), a switch, three captions (axes, circle, circle-not-drawn), the cusp caption also for `osculating`.
- `src/learning/model.ts`: `set-params` gains `osculating?: boolean`. sl/en `kinematics_graph_osculating(_help)`, `_cap_axes`, `_cap_osculating`, `_cap_osculating_far`. `docs/localization.md`: one row.
- Already present, not added: a_T and a_N rows, kappa and kappa v^2 rows, the speeding/slowing/stationary status, "ni določen"/"not defined" at a cusp.

## Observed
- Tests: `KinematicsGraph.test.tsx` (new describe, six tests), host test (one). Red first was NOT done in order: implementation preceded the tests; the only red run (`s1-red.log`) showed two failures that were test errors (object count 26 to 34; alpha 90 outside [5, 85]). Green: `s1-unit.log`. tsc empty, lint and build passed.
- Probe: `.command-logs/kin-c/probe.txt` (sl and en). Spec numbers all agree (three decimals): t = pi/2 speed 1,414, a_T 0,707, a_N -0,707, kappa -0,354, kappa v^2 -0,707; t = pi speed 2, a_T 0, a_N -1, kappa -0,25, radius 4; t = 1: 0,959, 0,878, -0,479. Cusp t = 0 and 2 pi: components "ni določen". t = 0,01: kappa -50, radius 0,02 (tiny circle drawn).
- Board at the opening: [-2,67; 5,66; 8,95; -2,09]. The circle at t = pi (centre (pi, -2), r 4) is NOT inside the board: its lower part runs to y = -6. Same at pi/2 and t = 1; the projectile apex circle (r 20,4) also leaves the board. The frame is unchanged (an arc is shown).
- The cycloid has no speed field. "Slow down" works on circular only: R = 1, omega 1 to 0,5 at pi/2: a_N 1 to 0,25, kappa stays 1.
- Markers: the arrows are built once per scene, not per step; the test checks equal object and marker counts across set-time calls (jsdom may hold no markers, so weak).

## Which readouts reveal later answers on the first frame
All of a_T, a_N, kappa, kappa v^2 and the status show at every t; with `osculating` the radius is drawn. The caption "aₙ in κ: negativno, ko tir zavija desno" names the sign.

## Doubts
- Projectile near the apex says "zavira" with a_T = -0,011 (a_T threshold for "approximately 0" is small).
- Frame does not widen for the circle.
- Not verified: browser look, 310 px inspector, smoke.

## Slice 1b (accept-or-repair of the osculating circle)

- Centre drawn as a small fixed point and a thin segment from the moving point to it, both in the circle's colour, hidden with the circle (`KinematicsGraph.tsx`, after the circle curve). `kinematics_graph_cap_osculating` now names the centre and radius (sl and en). Owned object count 34 to 36. Test: centre (pi, -2), segment length 4 at t = pi, hidden at the cusp; seen red before the change.
- Red for slice 1 against HEAD `KinematicsGraph.tsx` and `kinematicsModel.ts`: 9 failures in 2 files (`s1b-red.log`); green again with the change.
- Marker test: markers are 4 in jsdom (not vacuous). Now also asserts the same object ids across five `set-time` calls and an `osculating` toggle; a temporary per-`set-time` object replacement fails it (`s1b-marker-red.log`), reverted.
- Browser look (`s1b-shots/`): inspector is 310 px wide natively at 1366x768. Switch label on one line; "Razstavi pospešek..." on two. Captions cross the dashed normal axis at t = pi (desktop). On 390x844 the captions wrap and cover the arc and the point: the board is short there.
- Checks: unit (kinematics, learning/content) passed, tsc empty, lint passed, build passed.

## Layout fix (caption stack with every switch on)

- `frameFor(derived, captions?)` (`KinematicsGraph.tsx`) now takes the caption stack height at the actual board size: the frame has the board's aspect and keeps the stack clear above the path box (at least 120 px stay for the path). The stack counts every caption the switches can show, so the time never reframes; a switch does. A stored view is kept as before; a new board and Reset reframe once the scene stands (`reframeOnBuild`, as in the waves graph).
- Boards narrower than 500 px set the captions in 12 px type with 16 px rows (`captionMetrics`).
- The tangent and normal axes are no longer infinite lines: they are dashed curves cut off 4 px under the last caption row and at the board edges.
- Tests: `KinematicsGraph.test.tsx`, "the captions with every switch on keep clear..." (364 x 473 and 946 x 507 boards, 5 cases each); red on the old code 16 of 20 (the 4 desktop caption-vs-figure cases already passed).
- Not done: row counts are estimates (7.5 px per character), so a stack may leave a small gap; with the stack open the circular motion is small on desktop; a projectile at rest (v0 = 0) shows the cusp caption without a reserved row.

## Slice 2 (KN5 lesson content)

### Written
- `src/learning/content/kinematicsDecompositionGuidedLessons.ts` (new): `kinematicsDecompositionLesson` (demonstrationId `curve-kinematics`, 7 steps, one formula block `tangential-normal` and one worked example `kn5-cycloid`, both on step 7 only so no earlier step shows its answer), exported `KN5_*` constants. Own `scene` helper over `kinematicsSceneActions`.
- `kinematicsGuidedLessons.ts`: `osculating?: boolean` in `KinematicsSceneParams`.
- Probe: `.command-logs/kin-c/probe2.txt` (sl and en, current frame); the temporary test is deleted.

### Numbers per step (source: P = probe2.txt case, S = slice 1 probe.txt, A = stated arithmetic)
1. Opening cycloid t = pi/2, no switches. a_T 0,707, speed 1,414 (P c1). Learner: time 3,14 -> speed 2, a_T 0,001, status "pospešuje" (P c1b; not "stationary": 3,14 < pi). a_T(pi) = 0 and pi = 3,1416 are the spec's closed form cos(t/2) and arithmetic.
2. Opening t = 3,14, split off. Learner: split on -> velocity (2; 0,002), a (0,002; -1), a_T 0,001, a_N -1 (P c1b/c2). Caption "negativno, ko tir zavija desno" (sl.ts:3626).
3. Opening t = pi/2, split on: a (1; 0), a_T 0,707, a_N -0,707 (P c3). Learner t = 2: a (0,909; -0,416), a_T 0,54, a_N -0,841 (P c7c); 0,54^2 + 0,841^2 = 0,2916 + 0,7073 = 1,0 and 0,909^2 + 0,416^2 = 0,826 + 0,173 = 1,0 (A).
4. Opening t = 1, split on: speed 0,959, a_T 0,878, a_N -0,479 (P c4). Learner t = 1,1: speed 1,045, a_T 0,853 (P c4b). Estimate 0,959 + 0,1*0,878 = 1,047 (A).
5. Opening t = 3,14, split on, circle off: kappa -0,25. Learner circle on: r 4,000, centre (3,142; -2,000) (P c5); radius 1/0,25 (A). Box at that frame [-8,43; 14,11; 14,71; -1,31] (left, top, right, bottom): the centre (y = -2) and the lower circle are BELOW the board in the jsdom frame, so the text says "lower part and centre may be outside the picture".
6. Opening circular R 1, omega 1, t = 1, split and circle on: speed 1, kappa 1, a_N 1 (P c6). Learner omega 0,5: speed 0,5, kappa 1, a_N 0,25, kappa v^2 0,25, a_T 0 (P c6b). Time is not reset by a changed omega (`reconcileTime`, KinematicsGraph.tsx:692-708: only a changed motion resets, a shorter motion clamps).
7. Opening cycloid t = 2, both switches on. Example: speed 1,683, kappa -0,297, a_T 0,54, a_N -0,841, a (0,909; -0,416) (P c7c); 1,683^2 = 2,832, 0,297*2,832 = 0,841 (A). t = 0 "ni določen" (P / S c7); t = 0,01: kappa -50, r 0,02 (P c7b). Cardioid t = 1: kappa 0,855, speed 1,755, a_N 2,633, a_T -0,479 (P c7f). Projectile (defaults v0 20, alpha 45; kinematicsModel.ts:85) t = 1,44: v_x 14,142, g 9,81, kappa -0,049, r 20,387 (P c7i); 9,81/200 = 0,049 (A).
Sign convention: kappa < 0 for a right turn; the centre is point + n/kappa with n = (-v_y, v_x)/|v| (the left normal), KinematicsGraph.tsx:556-558.

### Deviations from the outline
- Step 3: the brief predicts a_T^2 + a_N^2 at pi/2, but a_T and a_N show on the first frame, so the prediction is "equal to |a|^2 at t = 2, and why"; the identity at pi/2 is given as context.
- Step 1 quotes a_T = 0,001 and the status "pospešuje" at 3,14, not "stationary" (P c1b); the prompt also asks for a reason and the expected text explains pi.
- Step 5: the centre is NOT at the board's lower edge: with the layout fix the box bottom is -1,31 and the centre y = -2 (P c5), so the text says only an arc is seen.
- Step 6 circular opens with the circle on (the circle coincides with the path, probe c6).
- Step 7 is on the cycloid at t = 2 (neutral, all arrows), not on a catalogue curve; the other curves are quoted as examples. The projectile status is not quoted.
- Controls are named by label without "drsnik/polje" (the type was not verified per control).

### Test design (for the tests worker)
- Scene mechanics: every scene is `prepared-scene` (demonstration default), optional `set-motion` (only step 6, `circular`), optional `set-params`, then `set-time`; run in one synchronous sequence (see `KinematicsLessonActions.host.test.tsx`).
- Openings (state after the scene) and post-change states:
  1. cycloid, t = pi/2, split off, osc off -> t = 3,14 (a_T 0,001, status speeding).
  2. cycloid, t = 3,14, split off -> split on (2 axis lines drawn, a_T 0,001, a_N -1).
  3. cycloid, t = pi/2, split on (a (1; 0)) -> t = 2 (a_T 0,54, a_N -0,841).
  4. cycloid, t = 1, split on -> t = 1,1 (speed 1,045, a_T 0,853).
  5. cycloid, t = 3,14, split on, osc off -> osc on (centre (3,142; -2), r 4, kappa -0,25).
  6. circular radius 1 omega 1, split and osc on, t = 1 -> omega 0,5 (a_N 0,25, kappa 1, kappa v^2 0,25).
  7. cycloid, t = 2, split and osc on.
- Readout rows: `time, speed, a-t, a-n, kappa, kappa-v2, acceleration`, status `[data-kinematics-status]`; compare sl and en.
- Quote list (each with source above): every number in the expected observations and the scene `expectedState` texts; assert the opening never already holds the learner's change (split off in 1-2, circle off in 5, omega 1 in 6, time 1 in 4, time pi/2 in 1 and 3).

### Still to do (slice 3, not touched)
Chapter entry, registry, registration, preview copy, test lists, `lessonMathNotation.test.ts` lesson set (my own scan of the file found no bare math outside `\(...\)`), smoke specs, docs.

### Checks
tsc empty (`s2-tsc.log`); backslash/raw checks: 0 singles (`s2-backslash.txt`); `just unit src/graphs/curves/kinematics src/learning/content/kinematicsGuidedLessons.test.ts` passed (`s2-unit.log`); `just lint` on both files passed (`s2-lint.log`).

### Doubts
- The board frame depends on the real board size: "centre may be outside the picture" is from the jsdom frame; not seen in a browser.
- The graph names (Tangentni pospešek aₜ, Kotna hitrost ω (rad/s)) are quoted with their symbols in plain text, so the math-notation test (slice 3) may flag them; no symbol-free label exists.
- Slovenian and English were written by me without review.
- Lesson not registered, so the lesson-catalog tests did not run on it.

### Slice 2d

- `src/learning/content/kinematicsDecompositionGuidedLessons.test.ts` (new). Part A: scenes on the real graph in sl and en, out of order and twice, restore, label strings, openings differ from the learner's change, learner actions give the quoted readouts, step 5 centre/radius against the closed form at t = 0,5 with the whole circle inside the board, no step shows its own answer. Part B: cycloid closed forms and a central finite difference of the speed (1e-5, 1e-8), cardioid, projectile apex (g/v_x^2), circular a_N = R omega^2, cusp "ni določen"/"not defined", every decimal of the lesson text in a reference set, no English decimals in sl (and no commas in en), "približno"/\approx before rounded numbers.
- Green: `s2d-unit.log`; tsc empty; lint passed. Red: one sl number changed (a = (0,919; ...) in step 3), 2 tests failed (`s2d-red.log`), lesson restored byte for byte.
- Not verified: the circle-inside-board check uses the jsdom frame only. No false claim found in the lesson text.

## Slice 3: chapter join

### Written
- Section `tangential-normal` (lesson id `curve-kinematics-tangential-normal`) after `circular-motion`: `kinematicsChapterRegistry.ts`, `kinematicsChapter.ts` (section, comment, purpose sentence). Chapter example is the parabola r(t) = (t, t^2) at t = 1 (a_T = 4/sqrt5 ~ 1,789, a_N = 2/sqrt5 ~ 0,894, kappa ~ 0,179, radius ~ 5,590, centre (-4; 3,5)), none of the lesson's cycloid or circle values.
- Count tests: `authoredChapterCoverage.test.ts` 199 to 200, `familyChapters.test.ts` kinematics minimum 5, smoke spec minimum 5, `lessonMathNotation.test.ts` import, lesson set and the extra `curve-kinematics` id, `guidedExamplePreviews.test.ts` pending `kinematics.tangential-normal.curve-kinematics` (card in F4). `docs/localization.md`: KN5 terms already present, no change. No change to the lesson file.
- Red first: both count tests failed before the section existed (`s3-red.log`).

### Outcome
See the handler return for check results (`s3-*.log`).

### Not verified
- Section text in a browser; Slovenian and English written without review.

## Arrow tags

- The tags of the arrows (`tip_v`, `tip_a`, `tip_at`, `tip_an`) are placed in pixels by `src/graphs/curves/kinematics/arrowTagPlacement.ts` (own bounded search, 6 rings x 8 directions per tag round its own tip; at most 4 tags). A spot is refused when it overlaps a placed tag, covers an arrowhead or the moving point, or lies nearer another tip than its own (unless the tips coincide); it costs extra on a shaft, over the captions, beyond the board, and (lightly) on the axis-number strips. The layout is cached by tips, point, board size and language, so a frame that moves no tip costs nothing; otherwise about 4 x 48 candidates x (4 tips + about 60 shaft samples). No object is rebuilt on a time step.
- Tests: "the arrow tags keep clear ..." in `KinematicsGraph.test.tsx` (364 x 473 and 946 x 507; cycloid at 0,5, pi/2, 3,14; projectile 1,5; rose 1,2). Red on the old code in `.command-logs/kin-c/tags-red.log`, green in `tags-unit.log`. Shots in `.command-logs/kin-c/tags-shots/`.
- Not fixed: tags may still sit on an axis number when the figure is crowded (rose at the origin, phone), because the number strips only cost a little (a heavier cost sent tags far from their tips); the tag size is an estimate, not measured text.

## Resize

Board resizes now reach the kinematics graph: `initialize()` listens to the board's `boundingbox` event (fired by the session's `resizeContainer` and `setBoundingBox`) and, when the canvas size differs from the last seen, applies the frame once (the caption room is keyed on the canvas size) and calls `boardUpdate()` (caption type size, `fullUpdate`, arrow tags re-placed). Pan and zoom keep the size and are ignored. Test: `the captions follow a resize of the board` in `KinematicsGraph.test.tsx` (946x507 -> 364x473 -> back; red without the listener: `.command-logs/kin-c/resize-red.log`, fontSize 14 expected 12). Shots: `.command-logs/kin-c/resize-shots/` (desk-to-phone, phone-to-desk): rows disjoint, clear of path, point and arrows in both. Not verified: other host resize paths (window/DevTools only through Playwright setViewportSize).
