# F3 level-sets Batch B slice 1: contour-map scene actions and opening probe

## Written
- `src/learning/model.ts` (levelsets union): `set-mode {mode}`, `set-function {fn}`, `set-level {level?, levelCount?}`, `set-probe {X, Y}`, `set-numeric {numeric}`.
- `src/graphs/levelsets/ContourMapGraph.tsx`: `applyLevelSetsAction`, `commitContour`, `registerLessonActions` (after `setCircleStep`). Merge, `parseContourState` before any write, unknown fields refused, only changed fields written in one `edit`, a valid no-op action still halts playback. `set-function` uses `withFunction` (same probe fallback as the chooser). Refuses `set-objective/-constraints/-sweep`.
- `src/graphs/levelsets/LinearProgramGraph.tsx`: refuses the five contour ops (`levelsets <op>: this operation belongs to the contour-map graph.`).
- Tests: new `ContourLessonActions.host.test.tsx` (6 tests); LP host test extended with the refusals.
- Logs in `.command-logs/ls-b/`: `host-red.log` (6/6 failed with the registry line commented out), `host.log` (green), `s1-unit.log` (src/graphs/levelsets green), `s1-tsc.log` (clean), `s1-lint.log` (clean), `probe.txt` (sl then en, 25 scenarios each).

## Observed
- Level rows: count n spreads levels from c upward in equal steps: bowl count 3 draws c = 1, 2, 3 ("od 1 do 3 v korakih po 1"); saddle at 0 count 3: 0, 1, 2; hills c = 1 count 5: 1, 1,125 ... 1,5 (step 0,125).
- Probe moves: `probe-f` row ("Vrednost f v sondi") follows (0,6; 0,8) -> 1, (1; 0,5) -> 1,25; the dashed "through" contour is drawn at c = f(p) (legend row, no readout of its own).
- Valley c = 1: length 4,4081; probe (0,6; 0,8) f = 6,76.
- Saddle c = 0: length 11,3137, status is the generic "nivojnica pri c = 0", it does not name the crossing lines.
- Hills at c = 1 (the default level) draws nothing (length 0, max of sin x sin y is 1): lessons must set a level below 1.
- Gradient: bowl probe (1,2; 1,6), tangent (-0,8; 0,6), dot 0, status "pravokoten je na nivojnico". Valley (2; 0) -> (4; 0), tangent (0; 1); (0; 1) -> (0; 20), tangent (-1; 0). Hills (1; 1) -> (0,4546487; 0,4546487), numeric (0,4546411; 0,4546411), error 0,0000076 (status adds the error sentence).
- Gradient is zero (status "gradient ničeln; tangente nivojnice ni", gradient/tangent rows "ničeln"/"ni določena") only at (0; 0) on the bowl, saddle and hills.
- Numeric toggle appears only in gradient mode (control), the action sets it in any mode; it adds rows `numeric`, `numeric-error` and the status sentence.
- Surface panel renders with a fake view (real WebGL not tested): title "Ploskev z = f(x, y)", aria "Ploskev funkcije: <name>", one marker, 116 polylines.
- Checkpoint restore returns the state (including numeric); defaults: bowl, level-sets, c = 1, one contour, probe (0,6; 0,8). Reset was not run in the probe (initial state = `DEFAULT_CONTOUR_STATE`).

## Probe summary (answers visible before the learner acts)
- Level-sets mode: status, `level` row and legend show c and the contour; the dashed through-contour and `probe-f` are visible. Gradient/perpendicularity are not shown.
- Gradient mode: status states gradient, length and perpendicularity at once; rows gradient, tangent, dot = 0 are shown. Switching back to level-sets hides all of them (probe rows stay).

## Doubts
- Hills maxima/minima/saddles at pi/2 are not on the 1/20 grid: the nearest probe (1,55; 1,55) gives gradient (0,0208; 0,0208), not zero, so no "gradient is zero" status at a maximum is reachable. Only (0; 0), a saddle of hills, shows it. LS2 text must not promise zero at a maximum.
- No in-scene labelling of maxima, minima or saddles exists.
- Real WebGL surface and Reset button not exercised.

## Slice 2 (partial: handoff at the budget signal; checks not run)

### Written
- New `src/learning/content/levelSetsContourGuidedLessons.ts`: `levelSetsSurfaceLesson` (LS1, 6 steps), `levelSetsGradientLesson` (LS2, 6 steps), helper `contourSceneActions`, constants `LS1_*` and `LS2_*` (openings and post-change states, documented in the comments above them). sl + en, no worked examples (they would reveal predictions), both end in free exploration on the Demonstration default. The GuidedLesson type has no id: ids `level-sets-surface` / `level-sets-gradient` are slice 3.
- Probe: `.command-logs/ls-b/probe2.txt` (sl and en, 23 scenarios, then 12 more as "probe3"); both temporary tests deleted.

### Steps (opening -> prediction -> learner change)
- LS1 (all level-sets mode): 1 bowl c=1 -> radii/gaps for c=1,2,3 -> count 3 (LS1_BOWL). 2 count 3 -> f and dashed set at (1; 0,5) -> type probe (LS1_BOWL_THREE). 3 bowl, probe (1; 0,5) -> axis intercepts of x²+10y²=1 -> choose Valley (LS1_BOWL_PROBE). 4 valley -> x²-y²=0 -> choose Saddle, c=0 (LS1_VALLEY). 5 saddle c=0 -> which of c=0,1,2 exist -> choose Hills, c=0,625, c=-0,875, c=1 (LS1_SADDLE). 6 default (explore Product).
- LS2: 1 default (level-sets) -> hand gradient at (0,6; 0,8) -> mode Gradient. 2 saddle c=0 probe (1;1) -> gradient and tangent via the chain rule -> Gradient. 3 valley probe (1;0) -> gradients at (1;0) and (0;1) -> Gradient, then probe (0;1). 4 hills c=0,625 probe (1,55; 1,55) -> short/long, status at (0;0) -> Gradient, probe (0;0). 5 hills (1;1) gradient mode -> decimals of agreement -> tick numeric. 6 default.

### Numbers and sources
Probe: bowl count 3 "od 1 do 3 v korakih po 1"; f(1;0,5)=1,25; saddle c=0 count 3 "od 0 do 2 v korakih po 1", f(1;0,5)=0,75; valley count 3 f(1;0,5)=3,5; hills c=0,625 count 3 "od 0,625 do 0,875 v korakih po 0,125", c=-0,875 "od −0,875 do −0,625", hills c=1 length 0 (count 1 and 5 probed, count 3 not); bowl gradient (1,2; 1,6) length 2 tangent (−0,8; 0,6); saddle (1;1) (2; −2) length 2,8284 tangent (0,7071068; 0,7071068); valley (1;0) (2; 0) tangent (0; 1), (0;1) (0; 20) tangent (−1; 0); hills (1,55; 1,55) (0,0208; 0,0208) length 0,0294 f 0,999568; (0;0) zero status; hills (1;1) exact (0,4546487; 0,4546487), estimate (0,4546411; 0,4546411), error 0,0000076; product (1;1) (1; 1) 1,4142 tangent (−0,7071068; 0,7071068) (probe2). Arithmetic: radii, gaps 0,414/0,318, √1,25≈1,118, 1/√10≈0,316, √10≈3,162, h²/6·0,4546≈7,6·10⁻⁶, 5 agreeing decimals.

### Deviations
- Hills levels use c=0,625 and c=-0,875, not 0,5: at c=0,5 the window corners (4;4), (-4;-4) also draw arcs (sin²4≈0,573). The level step on hills is 0,125 (not 1): c=0 count 3 draws 0, 0,125, 0,25, so the "c=1 draws nothing" prediction is asked as a separate learner action.
- Openings of steps 3 to 5 of LS1 equal the learner's previous state; LS2 openings change the function (scene setup) but keep level-sets mode.

### Test design (for the tests worker)
Scene mechanics: `contourSceneActions(id, spec)` = prepared-scene, set-function, set-level (defined fields only), set-probe, set-mode, set-numeric. Run each opening on `ContourMapGraph` (as `ContourLessonActions.host.test.tsx`), read `[data-readout]` ids (level, probe-f, gradient, tangent, dot, norm, numeric, numeric-error, length) and `[data-contour-status]`. Expected: values in the "Numbers" list above for the state named there; learner actions equal the controls (Funkcija/Function chooser, Vrednost nivojnice c, Več nivojnic, polji P x and P y, Način, numeric checkbox). Quote list: each number above with its source.

### Still to do / not run
Run after writing: tsc clean (s2-tsc.log empty), backslash checks 0 singles (s2-backslash.txt). Not run: `just unit src/graphs/levelsets`, `just lint`, the notation test pass, and a review of Slovenian wording were NOT run. Expected-observation texts were not traced digit by digit against probe2 yet beyond the list above.

### Doubts
- LS1 step 5 packs four learner actions; "c=1 draws nothing" at count 3 is inferred from count 1 and 5 probes.
- LS2 step 1 frames: the opening shows f(probe) only; step 4 opening shows f=0,999568 (a hint toward "near the maximum" by design).

### Slice 2d
- New `src/learning/content/levelSetsContourGuidedLessons.test.ts` (tests only). Part A: scene sweep on a real `ContourMapGraph` in sl and en (out of order, twice in one act), restore, openings vs asked state, LS2 predicting steps open in level-sets mode, learner actions via the real controls, prompt labels exist in graph strings. Part B: quotes recomputed from closed forms, hedge and decimal checks, tangent perpendicular, radii, valley ratio, hills gradient and central difference.
- Green: `just unit` (this file plus src/graphs/levelsets), tsc clean, lint clean. Red: sl text 1,118 changed to 1,128 failed `ls1-probe` (`.command-logs/ls-b/s2d-red.log`), restored.
- Findings (pinned in `KNOWN_UNHEDGED`, text unchanged): rounded readout values without a hedge: `0,0208`, `0,0294` (ls2-hills expected observation, `levelSetsContourGuidedLessons.ts:363-364`), `1,4142` (ls2-explore, `:405-406`). Prompt "Ocena gradienta (centralna razlika)" shortens the label "(centralna razlika, h = 0,01, izračunano)" (`:380`, not a false claim).
- Not verified: wording, browser smoke.

### Slice 2f
- Applied review findings in `levelSetsContourGuidedLessons.ts` (sl and en): B1 ls2-hills no longer names the peak or f = 0,999568 in the question (moved to the expected observation); N1 ls2-tangent asks for the dot product and says the step checks the theorem against the dashed contour already drawn; N2 ls1-hills prompt and observation now include c = 2 (Value c shows 2, Length 0, nothing drawn; derived from the readout code, not browser-checked); N3, N4, N5, N7 wording; N6 `približno`/`about` on 0,0208, 0,0294, 1,4142; the ls2-numeric prompt uses the exact readout label.
- Test: `KNOWN_UNHEDGED` emptied; dropped the pi/2 = 1,571 quote from ls2-hills, since the text no longer states it.
- Green: backslash/raw checks 0, `just unit` passed, tsc 0, lint 0. Not verified: browser smoke.

## Slice 3: chapter join (worker, handoff-v13)

### Written
- `levelSetsChapterRegistry.ts`: sections `surface` (LS1, `level-sets-surface`), `gradient` (LS2, `level-sets-gradient`), `linear-programming`, all on their Demonstrations (`contour-map` twice). `levelSetsChapter.ts`: two sections (surface: definition, gap ~ dc/|grad f| as an argument, drawn contours an illustration; gradient: directional-derivative argument, chain-rule theorem, no claim at grad f = 0), intro and comment rewritten. Examples: x^2+4y^2 = 4 (ellipse, semi-axes 2 and 1; c = 16 for the gap) and the gradient (4; 8) of x^2+4y^2 at (2; 1).
- `registration.ts` (no opt-out left), `guidedLessonOwnership.ts` (`contour-map` -> level-sets/surface), `guidedExamplePreviewCopy.ts` (`contour-map` row), tests (`familyChapters`, `authoredChapterCoverage` 183 -> 185, `lessonLookup.characterization`, `lessonCatalog`, `lessonMathNotation`, `registrationComposition`, `guidedExamplePreviews` two ids `pending`, `levelSetsGuidedLessons.test.ts` line 434 finds the LP section by id), smoke rows, `docs/localization.md` row, task 07 status.

### Outcome
- Red before source edits: `s3-red.log` (10 failures). tsc clean (`s3-tsc.log`), lint passed (`s3-lint.log`), `just build` passed, `just smoke-lesson contour-map` 2 passed (`s3-smoke.log`).
- `just unit src/learning src/graphs/levelsets` (`s3-unit.log`): 2 failed of 2936; one fixed (LP chapter test used `sections[0]`); rerun `s3-unit2.log`.
- OPEN: `lessonMathNotation.test.ts` still fails on `levelSetsContourGuidedLessons.ts:380-381` (ls2-numeric observationPrompt quotes the readout label "(centralna razlika, h = 0,01, izračunano)" as bare math). Not mine to edit (brief); fix in the lessons file.

### Not verified
No browser look at the chapter page; no cards for the two new ids (F4); the preview-copy row text was not checked against a screenshot.
