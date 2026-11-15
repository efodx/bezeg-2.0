# F3 level sets, Batch C, slice 1: descent and Lagrange scene actions

## Written
- `src/learning/model.ts` (levelsets union and comment): `set-start {X, Y}`, `set-step {step}`, `set-constraint {constraint?, lineParam?, circleParam?}`.
- `src/graphs/levelsets/ContourMapGraph.tsx` `applyLevelSetsAction`: the three cases, same style as Batch B (merge, `parseContourState` before any write, unknown fields refused, one edit, `edit()` halts playback). `set-constraint` needs at least one field.
- `LinearProgramGraph.tsx`: refuses the three with its thrown message. Host tests: `ContourLessonActions.host.test.tsx` (5 new tests), `LinearProgramLessonActions.host.test.tsx` (refusal list).
- No action sets the transient step counter; a changing action returns it to 0 (tested: next-step then `set-step` gives 0).

## Observed
- Host test red (handler cases disabled): 5 new tests fail (`host-red.log`); green: 18 passed (`host.log`). `just unit src/graphs/levelsets` green, `tsc` clean (0 bytes), lint clean.
- Playback starts in jsdom (`graph.play()` gives `playing === true`), and a valid action pauses it.
- 3D surface: the surface region and `surfaceScene()` exist, but the view is a fake in jsdom; nothing was observed of the real 3D rendering.

## Probe summary (full text in `.command-logs/ls-c/probe.txt`, sl then en)
- Descent mode rows: Začetek, Korak (H = 3, h = 0,03), Izbrani korak (k od N), Točka p_k, Vrednost f v točki, "Prvi korak z f < 0,000001", Obnašanje, Konec izračuna (and "Narisano" when the path escapes). Status: "Korak: k od N. <fn>: začetek (2; 1), korak h = ... <claim>". Controls: P0 x/y, Korak h slider, Naslednji korak, Predvajaj, Ponastavi (back to step 0, halts), Korak spusta slider.
- Answers visible before any press: yes. Valley status and the Obnašanje row state the classification ("konvergira za 1 ≤ H ≤ 9 ali za y₀ = 0", "pri H = 10 y niha", "pri H > 10 pot divergira") and the "Prvi korak" row gives 123/73/40 (H = 3/5/9), "ni dosežen v 200 korakih" (H = 10, 11), 31 for (2; 0) at H = 11. A predict step must therefore be asked in another mode (level-sets or lagrange) or before the learner switches to descent; switching the function to valley and mode to descent shows it at once.
- Bowl: status and Obnašanje say "ne trdimo, ali konvergira" too (no claim for the bowl), settled at step 125 (not a classification). Hills: same text, "Prvi korak" = 55 is the first f < 1e-6 crossing, which is meaningless on hills (f goes to −0,9988).
- Iterates match the spec: bowl (1,88; 0,94), (1,7672; 0,8836), (1,661168; 0,830584); valley H = 3 (1,88; 0,4), (1,7672; 0,16), (1,661168; 0,064); H = 9 (1,64; −0,8), (1,3448; 0,64), (1,102736; −0,512); H = 10 y = ±1 and ends at (0; 1), f = 10 at step 200; H = 11 last step is 75 (not 76), end (0; −868147,37), "Narisano = 11" steps inside 4 half-widths.
- Lagrange rows: Vezni pogoj, Točka na veznem pogoju, Vrednost f, Gradient f, Gradient g, Dotikanje, Dolžina puščic, Dotikališče (točno) or the tangent count. Bowl line T = 4: (1; 2), f = 5, grad (2; 4) and (1; 2), "vzporedna, λ = 2 (točno)". T = 0: (0; 2,5), f = 6,25, det −5; T = 8: (2; 1,5), 6,25, det 5; T = −4: (−1; 3), 10, det −10; T = 16: (4; 0,5), 16,25, det 15. The "Dotikališče (točno) = (1; 2)" row reveals the answer at once for the line, whatever T. The status line also shows λ for the exact line case only; the circle shows none.
- Product circle: K = 6 (1; 1), f = 1, "približno vzporedna: |sin kota| = 0"; K = 18 (−1; 1), f = −1, tangent; K = 30 (−1; −1), f = 1, tangent; K = 0 (1,414; 0) f = 0 and K = 12 (0; 1,414) f = 0 are NOT tangent (|sin| = 1); K = 3 non-tangent (|sin| = 0,7071). The tangent count row replaces the exact tangent point for the circle. Control: "Točka na krožnici, kot" slider (and the line's "Točka na premici, x"); the point is also draggable (legend).

## Doubts
- The brief lists K = 12 among the tangency points; the kernel has tangency at K = 6, 18, 30 (and 42), so K = 12 and K = 0 are non-tangent product points (f = 0). Slice 2 should use 6, 18, 30, 42.
- The descent claim row for the bowl says "no claim", and "Prvi korak" is a numeric settle step on hills; a lesson text must not lean on either.
- Not verified: the real 3D surface, the live drag handles, and browser smoke.

## Slice 2

### Written
- `src/learning/content/levelSetsOptimizationGuidedLessons.ts` (new; both lessons complete): header, `OptimizationSceneSpec`, `optimizationSceneActions` helper, all `LS3_*` and `LS4_*` scene constants, `LAB` label table (sl/en, symbols in math), `ls3Formulas` (descent-step, valley-factors, threshold) and all 7 `ls3Steps` (sl + en). The marker `// LS4_PART` at the end is where LS4 goes.
- `.command-logs/ls-c/probe2.txt` (sl + en learner-change probe; the temporary host test is deleted).

### Still to do
- Nothing in the lesson file. Slice 3 registers the lessons (ids `level-sets-descent`, `level-sets-lagrange`), the chapter, preview copy and tests, and runs the notation test (`lessonMathNotation.test.ts`) and the host tests over both lessons. Checks run (slice 2b): tsc clean, `bscheck`/`rawcheck` 0 singles, lint clean, `just unit src/graphs/levelsets` green (logs `.command-logs/ls-c/s2b-*.log`, `s2b-backslash.txt`). My own notation scan of non-math prose found nothing bare; the real notation test was not run.
- LS4 (written in 2b): opens 1 `LS4_BOWL_LINE` (level-sets, line stored; prediction of the minimum point; learner switches mode, reads f at x = 0, 1, 2); 2 `LS4_BOWL_LINE_LAGRANGE` (predict common points of the contour f = 6,25 with the line and the value with one; types x = 1); 3 same opening (predict both gradients at (1; 2) and lambda; types x = 1 then 2); 4 `LS4_PRODUCT_CIRCLE` (level-sets; predict extrema of xy on the circle; switches mode, sets angle 0, 45, ..., 315 degrees); 5 `LS4_EXPLORE`. LS4 numbers: f = 5 + 1,25 (x - 1)^2 and det = 5x - 5 (arithmetic); x = 0, 1, 2 rows from probe.txt T=0/4 and probe2 E1-E3; circle rows from probe2 F3-F6 and probe.txt K=6/18/30; angle 90 and 270 degrees (K = 12, 36): f = 0 by arithmetic (K = 12 probed in probe.txt, K = 36 by symmetry only).
- Rewordings done: descent-step "izpiše na šest decimalk"; step 2 gradient components; step 7 y0 = 0 "at every H the graph offers". Also: the threshold formula block no longer states 2/L = 0,1 or L = 20 (it gave away step 6's prediction).
- Test design additions for LS4: steps 2 and 3 share the opening `LS4_BOWL_LINE_LAGRANGE` (x = 0: point (0; 2,5), f 6,25, grad (0; 5), (1; 2), det -5); post-change `LS4_BOWL_TOUCH` (x = 1: (1; 2), f 5, grad (2; 4), (1; 2), "lambda = 2 (točno)"); step 3 then x = 2: (2; 1,5), grad (4; 3), det 5. Step 4 post-change `LS4_PRODUCT_K6/_K18/_K30/_K42` ("4 od 48 kotov"); K = 0 point (1,4142; 0) f 0 |sin| 1. The angle slider takes K (K * 7,5 degrees shown). Labels added to `LAB`: `constraint`, `pointC` ("Točka na veznem pogoju" / "Point on the constraint", the row label of the point in both lessons' readout list).

### Numbers per step (source = probe.txt sl unless stated)
- LS3 s1 bowl H=3 start (2;1): p1 (1,88; 0,94) f 4,418; p2 (1,7672; 0,8836) f 3,903745; p3 (1,661168; 0,830584) f 3,449349; factor 0,94, f factor 0,94^2 = 0,8836 (arithmetic).
- s2 valley H=3 (chooser keeps start and H: probe2 A1): p1 (1,88; 0,4) f 5,1344; p2 (1,7672; 0,16) 3,378996; p3 (1,661168; 0,064) 2,800439; f0 = 14; "Prvi korak" 123 (bowl 125).
- s3 H=9: (1,64; -0,8) 9,0896; (1,3448; 0,64) 5,904487; (1,102736; -0,512) 3,837467; factors 0,82 and -0,8; Prvi korak 40. s4 H=10: (1,6; -1) 12,56; (1,28; 1) 11,6384; (1,024; -1) 11,048576; p200 (0; 1) f 10; "ni dosežen v 200 korakih". s5 H=11: (1,56; -1,2) 16,8336; (1,2168; 1,44) 22,216602; (0,949104; -1,728) 30,760638; last step 75, p75 (0; -868147,369314); 1,2^75 about 8,68e5 (arithmetic).
- s6 start (2;0) H=11 (probe2 C0, probe.txt): (1,56;0) 2,4336; (1,2168;0) 1,480602; (0,949104;0) 0,900798; Prvi korak 31; status says converges; factor 1-2h = 0,78. s7 hills (2;1) H=3: p3 (2,031922; 0,954997) f 0,73105; p200 (1,601125; -1,532) f -0,998788.

### Test design (for the tests worker)
- Scene helper: `optimizationSceneActions(id, spec)` = prepared-scene, set-function, set-level, set-start, set-step, set-constraint, set-mode. Readout ids: `status` via `[data-contour-status]`; rows `[data-readout]`: function, level, window, start, step, steps, iterate, iterate-f, settled, claim, stop, drawn; lagrange: point, point-f, grad-f, grad-g, tangency, tangent-points (check ids in the graph).
- Openings: LS3_BOWL (bowl, descent, H=3, step 0); LS3_VALLEY; LS3_VALLEY_9/10/11; LS3_VALLEY_AXIS; LS3_EXPLORE = default. Learner actions: function chooser "Funkcija" (valley), field "Korak h (H = 100h)", button/`[data-action="next-step"]`, field "Korak spusta", field "P0, y". Post-change states equal the next constant (test with the helper and chooser as in `ContourLessonActions.host.test.tsx`).
- LS4 (constants defined, steps not written): LS4_BOWL_LINE opens in level-sets mode (probe2 E0: no constraint in legend or status, window -2..2); after the mode switch the point is (0; 2,5) f 6,25, det -5, "Dotikališče (točno)" = (1; 2) (probe.txt T=0; probe2 E1). x=2: (2; 1,5) 6,25 det 5; x=1: (1; 2) f 5 grad (2;4),(1;2) lambda 2. Product circle (probe2 F0-F6): K=6 (1;1) f 1, K=18 (-1;1) -1, K=30 (-1;-1) 1, K=42 (1;-1) -1 all |sin|=0; K=0 (1,414;0) f 0 and K=24 (-1,414;0) not tangent (|sin| 1); tangent count row "4 od 48 kotov". Level-sets product, level 0 count 3 gives levels from 0 to 2 step 1. Angle slider shows degrees (K*7,5: 45, 135, 225, 315) but takes K.

### Doubts
- Titles with symbols are avoided; labels with symbols are wrapped in math in `LAB`.
- The notation heuristics (assignment, tuple, subscript) were designed against but not run.

### Slice 2d
- `src/learning/content/levelSetsOptimizationGuidedLessons.test.ts` (new, tests only). Part A: scene sweep of all 12 LS3/LS4 steps in sl and en (out of order, twice in one act, counter 0, restore, LS4 steps 1 and 4 hide the constraint, no opening equals the asked state, prompt labels exist in graph strings, learner actions give the quoted readouts). Part B: quoted numbers recomputed from the descent iteration and closed forms (hedging, no English decimals in sl), integer readouts 125/123/40/31/75/200, threshold, H = 10 and 11 cases, line and circle Lagrange facts.
- Checks: `just unit` (this file + src/graphs/levelsets) 245 passed; tsc and lint clean; red: sl quote 3,903745 changed to 3,903746 failed ls3-bowl (`s2d-red.log`), restored. No false claim found. Not verified: browser, real 3D view; the text says to set the circle angle in degrees while the field takes K (K * 7,5 degrees); tested with K only.

### Slice 2f
- Lesson file: LS4 step 2 now opens in level-sets mode (LS4_BOWL_LINE, line not drawn), asks the touching-value prediction by substitution, then the learner switches to Lagrange; LS3 learning goal and edge case reworded without the threshold; valley-factors sign/shrink sentences moved to the threshold block; LS3 step 6 asks for the condition on 1 - 20h and reads two readouts; "samostojno" x2; "ni narisana"; LS4 step 4 reads 45/135/225/315 and 0 degrees; LS3 step 2 hint on the y component dropped.
- Tests: ls4-touch opening is level-sets and chooses the mode; NAMED labels for ls3-threshold and ls4-touch; mounted-label test uses ls4-gradients.
- Checks: just unit 245 passed; tsc, lint clean; bscheck/rawcheck 0 singles.

## Slice 3: chapter join

### Written
- Sections `descent` (LS3, `level-sets-descent`) and `lagrange` (LS4, `level-sets-lagrange`) on `contour-map` between `gradient` and `linear-programming`: `levelSetsChapterRegistry.ts`, `levelSetsChapter.ts` (intro, comment, two sections), comments in `guidedLessonOwnership.ts`, `registration.ts`, `registrationComposition.test.ts` (ownership of `contour-map` stays `surface`; the other lessons derive from the chapter).
- Tests: `authoredChapterCoverage` 189, `familyChapters` level-sets minimum 5, `lessonLookup.characterization` LS3/LS4 rows, `lessonMathNotation` import, `lessonSets` entry and scan list, `guidedExamplePreviews.test.ts` pending ids, smoke minimum `'level-sets': 5`. No `lessonCatalog`/`lessonOwnerIntegrity`/`LearningPage` change was needed; no smoke row per lesson (Batch B added one for LS1 only).
- Examples: descent on f = 2x^2 (factor 1 - 4h, L = 4, threshold h < 1/2; h = 0,1 gives 0,6, 0,36, 0,216, f 2, 0,72, 0,2592); Lagrange x + y on x^2 + y^2 = 8 ((2; 2) f = 4, lambda = 1/4; (-2; -2) f = -4, lambda = -1/4) and x^3 on y = 0 as non-sufficiency.
- `docs/localization.md` one row (handler-unreviewed); task 08 status line.
- Deviation: no preview copy rows in `levelSetsPreviewCopy.ts`. The test requires copy keys = non-pending ids, and `mathAltText.test.ts` fails for a copy row without an image (`resolveGuidedExamplePreview` is undefined). The F4 card adds image and copy together.

### Outcome
- Red before source edits: `s3-red.log` (5 failed). tsc clean (`just typecheck`, `s3-tsc.log`; bare `npx` is not on this shell's path). Lint clean (`s3-lint.log`). bscheck singles only in String.raw formulas (15 before, 20 now), rawcheck 0 outside String.raw.
- `just unit src/learning src/graphs/levelsets src/graphs/analysis` passed (`s3-unit.log`); `just build` passed (`s3-build.log`); `just smoke-lesson contour-map` passed (`s3-smoke.log`; it runs the existing LS1 row only).

### Not verified
- The two chapter sections' rendering in a browser; the lesson file was not edited.
