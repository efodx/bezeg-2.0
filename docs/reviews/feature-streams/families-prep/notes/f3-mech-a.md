# F3 mechanical curves Batch A, slice 1 (worker note) - PARTIAL (budget signal)

## Written
- `src/learning/model.ts`: LessonAction kind `descent`: `set-mode {mode: race|track|tautochrone}`, `set-time {t}`, `set-params {radius?, endX?, endY?, p1x?, p1y?, p2x?, p2y?, theta1..3?, showCycloid?, showArc?}`.
- `src/graphs/mechanics/DescentGraph.tsx`: `applyDescentAction` (exhaustive `never`, no casts/any; whole new state through `parseDescentState` before any write, throws otherwise; writes through `edit`, which pauses and reconciles the time) and `registerLessonActions`. Playback is never part of a scene (`setTime` halts; `edit` halts).
- Existing tests touched only to narrow a type: `Extract<LessonAction, {kind: 'kinematics'; operation: 'set-params'}>` in `KinematicsLessonActions.host.test.tsx` and `kinematicsGuidedLessons.test.ts` (the new `descent` `set-params` made the old `Extract` a union).
- `src/learning/content/mechanicalCurvesGuidedLessons.ts`: MC1 `mechanicalCurvesRaceLesson` (6 steps), MC2 `mechanicalCurvesTrackLesson` (7 steps), sl+en, scene helper `descentSceneActions`. Not imported anywhere yet.
- Temporary probe test deleted; its output is in `.command-logs/f3-mech-a/probe.txt`.

## Observed
- `npx tsc --noEmit --pretty false`: 0 lines (`.command-logs/f3-mech-a/tsc4.log`) after all of the above.
- No unit test other than the probe was run. Step 2 (opening view), step 4 (wiring) and step 5 (checks) are NOT done.

## Numbers per step (REAL readouts, probe.txt, sl and en)
Race tEnd = 1,19 (slider end), r=1: B (3,14; 2); line 1,189, arc 1,0285, cycloid 1,003, winner Cikloida, line slower 18,5 %. r=0,25 (tEnd 0,6): cycloid 0,5015, arc 0,5142, line 0,5945, still 18,5 %. r=3 (tEnd 2,06): cycloid 1,7373, arc 1,7814, line 2,0595. r=2: 1,4185 / 1,4545 / 1,6816.
Track (mode `track`; switching from race shows the notice "Nastavitve so ponastavljene" in the status): default B (3,25; 2), P1 (0,5; 2), P2 (2; 2,5): track 1,0366, line 1,2184, cycloid 1,0203, theta 3,1947, r 1,0007, difference 0,0163 s (1,6 %), tEnd 1,04. Dragged P1 (0,25; 1,5) P2 (1,5; 2,5): 1,0331, diff 0,0127 (1,2 %). B (3; 1,5): line scene P1 (1; 0,5) P2 (2; 1): track = line 1,2365, cycloid 0,9866 (25,3 %), tEnd 1,24; bent P1 (0,5; 1) P2 (2; 1,75): 1,002, diff 0,0154 (1,6 %); close P1 (0,25; 1) P2 (1,5; 1,75): 0,9884, diff 0,0018 (0,2 %), tEnd 0,99. Horizontal P1 (1; 0): "Kroglica na tem tiru ne zdrsne. Čas ni izračunan.", track "brez časa", tEnd 1,03; P1 (1; -0,5): status "Kontrolna točka leži nad začetkom A; ...".
Not read from the graph (formula only, still to check in the content test): 32,5 degrees (arctan(2/pi)); arc dip depth 2,21 (`arcCentre`); arc 2,5 % slower than the cycloid; qualitative bead-depth claims at t=0,4 (line highest) and t=0,5 (cycloid and arc deeper than line) - check with `beadParameter` and `track.y` from `src/mechanics`; closed forms 1,0030 / 3,7242 / 1,1890 and 1,0203.

## Learner actions the text asks for
MC1: slider/Play (s2); radius r = 0,25 (scene) and r = 3 (s6, readouts quoted). MC2: drag/type P1 (0,25; 1,5), P2 (1,5; 2,5) (s2); from the line scene drag P1 to (0,5; 1), P2 to (2; 1,75) (s3, quoted 1,002); drag the points and B (s5, s7); P1 to (1; 0) is the scene, learner moves P1 to (1; -0,5) (s6).

## Slice 1b (done)
- Opening view checked on 2026-11-12 (build, 1280x800 and 390x844): the whole circular arc is visible, no fix needed. `.command-logs/f3-mech-a/view-1280x800.png`, `view-390x844.png`; task 03 wording corrected.
- Wired: `mechanicalCurvesChapterRegistry.ts`, `mechanicalCurvesChapter.ts` (sections `race-the-tracks`, `drag-the-track`), chapterOwnedLessons, familyChapters (after kinematics), guidedLessonOwnership, LearningPage (preview + strand), `lesson: false` removed, guidedExamplePreviewCopy, test lists (31 chapters, 149 references, notation, owner integrity, patch adjacency, lessonless lists, mechanics registrationComposition), both smoke specs (new default row `mechanicsDescent`, minFrames 13 guessed from the kinematics pattern).
- Notation test caught 4 single-backslash delimiters in mc2 text; fixed.
- Observed: tsc 0 lines (`tsc5.log` and after the fix); `just unit` passed on src/learning/chapter, runtime, LearningPage.test.tsx, src/graphs/mechanics, src/graphs/curves/kinematics; src/learning/content had 1 failure (the notation test), rerun alone passed (`unit-notation.log`); content directory not rerun whole.

## Still to do
1. Docs: localization.md terms row (tir, kroglica, cikloida, brahistohrona, čas spusta); mark task 04 status.
2. Host test for the three descent actions; content test of the numbers (see "Not read from the graph").
3. Smoke specs not run (playwright); minFrames 13 and `boardStats(page).points >= 1` for the descent graph unverified.
4. Chapter word count >= 450 per language not asserted by me separately (familyChapters.test passed in the content run).

## Doubts
- Slovenian text unreviewed. Step mc2-horizontal says "kroglica ostane, kjer je" (physical reading of the graph's "ne zdrsne"). The admissibility sentence ("P1 or P2 above A") omits the y1 = 0 case in the edge case text; the step covers it.
- MC2 step 1's prediction question cannot be hidden from the readouts (the line time is always listed), so the learner is asked to predict before reading.
- The mode change race -> track adds the status notice "Nastavitve so ponastavljene" in every MC2 scene; harmless but visible in the status line.
- `MC1_END` (1,19) and the other scene times are literals (the graph's `tEnd` rounded up); the content test should assert them against `deriveDescent(...).tEnd`.

## Outcome (slice 2) - PARTIAL (budget signal)
Done
- `src/graphs/mechanics/DescentLessonActions.host.test.tsx` (7 tests): set-mode, set-time, set-params equal the matching input (state, readouts, status); one synchronous sequence incl. a shortened run; every action halts playback (a no-op set-params does not, as typing the same value does not); restore; supportsLessonAction; strict rejection (24 bad actions, state/readouts/status unchanged). Red: registration commented out, 7/7 failed (`host-red.log`), restored (cmp). Green: `host-green2.log`.
- `src/learning/content/mechanicalCurvesGuidedLessons.test.ts` (16 tests): per step restore then scene in one act, out of order and twice; every quoted number in sl and en looked up; a guard that no other number with decimals appears in a step's English text; expected values from independent closed forms and midpoint integrals (arc, Bezier, cycloid through B by bisection); the learner actions (slider, every radius 0,25..3, bent track, P1 at/above A, cycloid switch); a 400-track grid shows no Bezier track under the cycloid; worked-example latex; scene times vs rounded-up slider ends and `deriveDescent(...).tEnd`; restore on exit. Red: two quoted numbers changed, 1 test failed (`content-red.log`), restored (cmp). Green: `content-green3.log`.
- Fixes the tests proved necessary: (1) lesson text said `T_l = L/sqrt(g)` for the line; correct is `L/sqrt(g r)` (equal only at r = 1): fixed in the formula block, both explanations and the example calculation (`mechanicalCurvesGuidedLessons.ts`). (2) `applyDescentAction` set-params silently dropped unknown fields (and `mode`); now throws (`DescentGraph.tsx`).
- Checked in test: arc dip is 2,2074 m (quoted 2,21), arc 2,5 % slower, 32,5 degrees, bead depths at 0,4 and 0,5 s, scene times.
- Docs: `docs/localization.md` three rows (tir/kroglica/cas spusta; cikloida/brahistohrona; kroglica ne zdrsne), task 04 status line, README row 04.
Observed checks (logs in `.command-logs/f3-mech-a/`): `just unit` passed on src/learning/content (whole, `unit-content.log`), src/learning/chapter, src/graphs/mechanics, src/graphs/curves; `npx tsc --noEmit` 0 lines (`tsc6.log`); `just lint` passed (`lint.log`).
NOT run: the six sweeps, `npx vite build`, `just smoke-lesson mechanics-descent`, `just smoke-lesson curve-parametric curve-kinematics` (minFrames 13 and the descent row still unverified). Re-run the unit/tsc checks after any further edit to the two touched source files.

## Handler review (handler 11)
- Sonnet mathematical and engineering review: every time recomputed independently (bisection and quadrature); brachistochrone stated as a cited theorem, dragging as illustration; engineering cleared.
- Blocking finding fixed by the slice-2 worker (its test was red first): the line time is \(T_l=L/\sqrt{gr}=\sqrt{\pi^2+4}\,\sqrt{r/g}\), not \(L/\sqrt g\) (true only at \(r=1\)). The worker also made `set-params` reject unknown fields.
- Fixed by the handler: no tangential force only at \(A\) (`mc2-horizontal`); the line gains depth and speed more slowly (`mc1`), not "stays slow"; *zato je to dovoljeno*; chapter formula in the lessons' depth convention \(\sqrt{2g\,y(u)}\) with \(y(u)\) defined; the control-point-above-\(A\) rule stated as the graph's cautious sufficient condition, as in the lesson edge case.
- Handler checks after the fixes: `just unit` content and mechanics, `tsc`, the six sweeps for `mechanics-descent`, `just build`, `just smoke-lesson mechanics-descent curve-parametric curve-kinematics` passed (`.command-logs/f3-mech-a/h11-*.log`).
