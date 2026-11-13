# F3 Batch B slice 2: PP3 lesson content (linearization)

## Written
- `src/learning/content/phasePortraitsGuidedLessons.ts`: `PhasePlaneSceneSpec` gained `equilibrium` (0|1) and `zoom` (0-4) and `system` 'weak-spiral'; `phasePlaneSceneActions` emits `set-equilibrium` and `set-zoom` after `set-system` (existing scenes unchanged). Scene constants `PP3_*` (after `PP2_FREE`), `pp3Formulas` (`pp3-jacobian`, `pp3-hartman-grobman`), `pp3Steps` (6 steps, sl + en), `linearizationSources`, `linearizationEdgeCases`, `linearization`, exported `linearizationLesson` (no `id` field: lessons carry none, registration is a later slice).
- Probe: `.command-logs/pp-b/probe2.txt` (sl 1-300, en 301-600); the temporary test is deleted.

## Steps (opening -> prediction -> learner change)
1. Linear default (node, tau -7, delta 10). Predict J, tau, delta, Delta, eigenvalues, type of the pendulum at (pi,0) by hand. Change: System = pendulum, then Equilibrium = (pi,0).
2. Pendulum (pi,0), zoom 0, seeds (3,15; 0,05), (3,1; -0,05). Predict how solid vs dashed ring differ at zoom 3 vs 0. Change: zoom slider 3.
3. Pendulum (pi,0), zoom 0, seed (1,0). Predict J, type, hyperbolic, what J decides at (0,0). Change: Equilibrium = (0,0).
4. Pendulum (0,0), zoom 0, seed (1,0). Predict J, type, closedness of the weak spiral, r(10) for r0=1. Change: System = weak spiral, time 10.
5. Weak spiral, zoom 0, seed (0,1; 0). Predict whether zoom 3 makes it look like the linear centre / is closed. Change: zoom 3, time 10.
6. Free: pendulum (0,0), zoom 0, seed (1,0); Hartman-Grobman formula only here (steps 1-5 carry only the Jacobian formula, so no answer is given in the pre-reveal text).

## Numbers per step with source
| Step | Number | Source |
|---|---|---|
| 1 | linear opening: node, tau -7, delta 10 | probe.txt opening (linear default) |
| 1 | J (0 1;1 0), tau 0, delta -1, Delta 4, lambda 1, -1, hyperbolic yes, "sedlo" | probe.txt pendulum (pi,0) zoom 0; arithmetic -cos(pi)=1 |
| 2 | view theta 2,6416..3,6416, omega -0,5..0,5; ring radius 0,375 | probe2 S2 zoom 3 view row; 0,75*0,5 |
| 2 | ring stopped 20/24 vs 24/24 (zoom 0), 24/24 both (zoom 3) | probe2 S2 |
| 2 | seed 1 forward 2,86 s, backward 3,2 s; seed 2 forward 2,4 s, backward 4,8 s (zoom 3); H > 1 both (1,001215; 1,000385) | probe2 S2 zoom 3 t=0 |
| 2 | sin x / x >= 0,9767 for abs x <= 0,375; 0,0470 at x=3 | node: sin(0.375)/0.375 = 0.97673, sin(3)/3 = 0.04704 |
| 3 | J (0 1;-1 0), tau 0, delta 1, Delta -4, lambda 0 +- 1 i, hyperbolic ne, decision row text, H = -0,540302, 10 s both | probe2 S3 after eq 0; Delta arithmetic |
| 4 | J (0 -1;1 0), tau 0, delta 1, hyperbolic ne | probe.txt weak-spiral; probe2 S4 |
| 4 | seed (1,0) forward 10 s, backward stopped 0,48 s; ring 12/24 vs 0/24 (zoom 0) | probe2 S4 after |
| 4 | r(1) 0,5773503; r(10) 0,2182179 (r0=1) | spec PP3; node 0.5773502692, 0.2182178902 |
| 5 | seed (0,1;0) forward and backward 10 s at zoom 0 and 3; ring 12/24 vs 0/24 at both | probe2 S5 open and after |
| 5 | r(10) 0,0912871 (r0 = 0,1); drop 0,0087; 0,017 of half-width 0,5 | spec PP3; node 0.0087129, 0.017426 |
| 6 | pendulum (pi,0): sedlo and J constant for zoom 0-4; ring 20/24 at zoom 0, 24/24 at 1-4; linear 24/24 all | probe.txt zoom 0-4 |
| 6 | pendulum (0,0): 20/24 vs 0/24 zoom 0; 0/24 both zoom 3 | probe.txt |

## Deviations
- Spec steps 3 and 5 not merged: the decision row is visible from the start, so step 3 predicts J at (0,0) and step 5 predicts the zoom on the weak spiral (outline step 5, "does zoom make it look linear"); the decision-row sentence is quoted in steps 3 and 5.
- HG theorem formula attached to step 6 (not step 2 or 5) so the pre-reveal text does not answer; the step 2 observation points forward to it.
- Free state equals the step 4 opening (pendulum (0,0), zoom 0, seed (1,0)).
- New hint: step 5 asks about the ring rows, which stay 12/24 vs 0/24 with zoom for the weak spiral (contrast to the saddle).

## Test design (for the tests worker)
- Scene mechanics: `planeScene(id, spec)` actions = prepared-scene, set-system, set-equilibrium, set-zoom, set-matrix, set-seeds (only those given). Seeds absolute, X/20. Zoom half-width 4/2^zoom.
- Readout ids: `type`, `jacobian`, `hyperbolic`, `decision`, `eigen`, `view`, `seed-N`, `energy-N`, `ring`, `ring-linear`, plus `status` (`[data-phase-status]`). Time is the slider labelled `phase_graph_time_label`; zoom `phase_graph_zoom_label`.
- Openings and post-change states (sl; en has the same numbers with a decimal point):
  1 open: linear, status "Tip: stabilno vozlišče (τ = −7, δ = 10)". After: pendulum + (pi,0): "sedlo (τ = 0, δ = −1)", jacobian (0; 1),(1; 0), hyperbolic "da", eigen "λ₁ = 1, λ₂ = −1".
  2 open: pendulum eq 1 zoom 0 seeds [{63,1},{62,-1}]; ring "20 od 24", ring-linear "24 od 24"; view "polovična širina 4". After zoom 3: view x 2,6416..3,6416, y -0,5..0,5; ring and ring-linear "24 od 24"; seed-1 forward 2,86 s / backward 3,2 s; seed-2 2,4 s / 4,8 s (not stopped at 0 s).
  3 open: pendulum eq 1 seed (1,0), "sedlo". After eq 0: "središče (center) (τ = 0, δ = 1)", jacobian (0; 1),(−1; 0), hyperbolic "ne", eigen "λ = 0 ± 1 i", decision "Ni hiperbolična: linearizacija ne določa lokalnega portreta.", energy-1 "H = −0,540302 < 1", seed-1 both halves for all 10 s.
  4 open: pendulum eq 0 zoom 0 seed (1,0). After weak-spiral: jacobian (0; −1),(1; 0), centre, hyperbolic "ne"; seed-1 forward all 10 s, backward stopped 0,48 s; ring "12 od 24", ring-linear "0 od 24".
  5 open: weak-spiral zoom 0 seed (0,1;0): seed-1 forward and backward for all 10 s, ring 12/24, linear 0/24. After zoom 3: same seed and ring rows, view half-width 0,5.
  6 free: pendulum eq 0 zoom 0 seed (1,0). Zoom 0-4 at (pi,0): type/jacobian unchanged, ring 20/24 at 0, 24/24 at 1-4.
- Quote list: every number in the table above; independent oracles: J by central differences (pendulum at (0,0), (pi,0); weak spiral at 0); quadratic formula for tau, delta, Delta, lambda; r(t) closed form and an RK4 of the weak spiral; sin(x)/x values; no test of picture closeness exists.
- Check: no step's opening equals its asked-for state (1: linear vs pendulum; 2: zoom 0 vs 3; 3: eq 1 vs 0; 4: pendulum vs weak spiral; 5: zoom 0 vs 3); seeds in steps 2 and 5 inside the zoomed view.

## Observed
- tsc clean (`s2-tsc.log` empty); `just unit src/graphs/dynamics src/learning/content/phasePortraitsGuidedLessons.test.ts src/learning/content/lessonMathNotation.test.ts` passed; `just lint` passed; backslash checks: 2 hits, both pre-existing (lines 17 regex, 165 `Newton\'s`).

## Not verified / doubts
- The lesson is not registered, so `lessonMathNotation.test.ts` and the existing lesson sweep do not read it yet; its notation is not machine-checked here.
- No drawing inspected: "solid and dashed curves closer at small radius" is worded as an expectation checked by eye, supported only by the field ratio sin x/x; the stop counts do not measure it.
- Step 1: selecting the pendulum before the equilibrium shows (0,0) (the step 3 centre) for one moment; the prompt says to read only after both controls.
- Spec step 5 ("status says not hyperbolic") is quoted in steps 3 and 5, no separate step.
- Zoom slider control is named by label and the shown text "polovična širina 0,5"; I did not exercise it through the UI (only actions).

## Still to do
Chapter, registration, preview copy, tests, smoke (later slices).

## Slice 2d (PP3 content tests)
- Added to `src/learning/content/phasePortraitsGuidedLessons.test.ts` (tests only): Part A "PP3 opens on a real PhasePortraitGraph" (sweep out of order and twice, restore, prompt-named labels and readouts exist, no opening equals its asked-for state, zoomed seeds inside the view and not stopped at 0 s) and Part B "PP3: every number the text quotes is recomputed independently" (central-difference Jacobians, quadratic formula, r(t) vs RK4 to 1e-7, quote table in sl and en, independent ring counts, readouts after the learner's changes). `ppStepOf` now also finds PP3 steps; the lesson is imported directly (not registered).
- Red: one sl quote `0,2182179` changed to `0,2182189` in the lesson file, quote test failed (`s2d-red.log`), restored. Green: unit, tsc (empty), lint clean.
- No false claim found. Prompt wording differs from labels only by case or inflection (sl "Jacobijevo matriko", en "time t"); tests allow that.

## Review (handler 18)
Sonnet review (`.command-logs/pp-b/review.md` stub; findings in the handler's record): 1 blocking, 5 non-blocking. Applied by the handler: step 5 no longer says the ring difference survives the zoom (the counts stay, the picture shrinks less at zoom 3); step 1 tells the learner the (0,0) readouts flash while the system is picked; step 2 says the start points are in view at time 0; step 4 says J of the weak spiral is −J of the pendulum; step 5 prompt asks picture versus computation only (and is gender-neutral). Accepted: the always-visible decision row hints step 2's prediction (graph without view modes). Checks after the edits: tsc, lint, unit (lesson, notation, dynamics) green.

## Slice 3: chapter join

### Written
- `phasePortraitsChapterRegistry.ts`: section `linearization` (`phase-portraits-linearization`, Demonstration `phase-portrait`) between `pendulum` and `logistic-map`. `phasePortraitsChapter.ts`: section `linearization` (title, Jacobian formula, four paragraphs, investigation prompt): Hartman-Grobman as a theorem (FMF Analiza 3), zoom as illustration; example `x'=x+y^2, y'=-2y` (J = diag(1,-2), saddle) and the 1-D pair `x'=-x^3`, `x'=x^3`; the pendulum points and the weak spiral are not answered.
- Wiring: `guidedLessonOwnership.ts` (comment only, ownership derived); tests `familyChapters.test.ts` (min 4 -> 5), `authoredChapterCoverage.test.ts` (179 -> 180, expected id), `lessonLookup.characterization.test.ts` (PP3 row), `guidedExamplePreviews.test.ts` (id listed as `pending`, as AB-B-4 did), `lessonSmokeCoverage.test.ts` (extra row). Smoke: row `phase-portrait-linearization` (6 steps, minFrames 12), unified minimum 5. Docs: `localization.md` row, task 06 status line.

### Outcome
tsc clean; unit `src/learning src/graphs/dynamics` passed (before the last prose edit), `src/learning/content chapter runtime` passed after it; lint passed; build passed; `just smoke-lesson` phase-portrait and phase-portrait-linearization/pendulum: all passed. Red run showed 4 expected failures (`s3-red.log`).

### Not verified
- No preview copy row: the card test requires copy keys to equal non-pending ids, so the row and PNG arrive with the F5 card.
- Chapter page not inspected visually; full unified smoke not run.
