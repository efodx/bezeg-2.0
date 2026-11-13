# pp-a slice 2: PP1 and PP2 lesson content (partial, stopped at HANDOFF)

## Written
`src/learning/content/phasePortraitsGuidedLessons.ts`: `phasePlaneSceneActions`/`planeScene` and the PP1_/PP2_ scene constants (after `phaseScene`); `pp1Formulas`, `pp1Example`, `pp1Steps` (7 steps), `pp2Formulas`, `pp2Steps` (5 steps) before the PP4 section; `planeSources`, `planeEdgeCases`, lessons `linearSystemLesson` (`phase-portraits-linear-system` is NOT set: lessons carry only `demonstrationId: 'phase-portrait'`, ids belong to registration, a later slice) and `pendulumLesson`, exported before `logisticMap`. File header comment still says PP1 to PP3 belong to later batches: update.
Observed: `npx tsc --noEmit` 0 lines (`s2-tsc.log`); backslash singles 0 (`s2-backslash.txt`).

## Not run
- `just unit src/graphs/dynamics src/learning/content/phasePortraitsGuidedLessons.test.ts` (check 3).
- `lessonMathNotation` heuristics on the new lessons (not registered; a temporary copy of the test over `linearSystemLesson`/`pendulumLesson` is needed). Risks: `Začetna točka 2: θ` labels outside math, `x=1` style text outside math was avoided.
- No probe of any opening; no smoke test. Latex fields use `{,}` (as PP4); `phase-portrait` is not yet in `DECIMAL_COMMA_LATEX_LESSONS` (later slice must add it).

## Per step (opening -> prediction -> learner change)
PP1: 1 E=(4 1;2 3) seed (1,0) -> what does -E do -> type a..d = -4,-1,-2,-3. 2 N seed (1,1) (on the fast line) -> which eigen-line do orbits touch -> seed 1 to (1,0), add (0,1),(-1,0),(0,-1). 3 N with 4 seeds (1,0),(0,1),(1;0,05),(0,05;1) -> type and who approaches 0 for diag(1,-1) -> type entries 1,0,0,-1. 4 N (c=-2) -> c with Delta=0 (c=1/4) -> c = 0, 0,25, 0,5. 5 [[0,-1],[1,-1/4]] -> type at d=0 -> d=0. 6 centre -> direction of Euler drift (derivation in the worked example after the prompt) -> slider t=6,28, hand arithmetic h=0,05. 7 N free.
PP2: 1 linear centre (0 1;-1 0) seed (1,0) -> H and orbit of the pendulum -> chooser System = pendulum. 2 pendulum (1,0) -> H, omega max, theta max for (2,0),(0;1,9) -> add two seeds. 3 pendulum (0;1,9) -> readout at omega 2 and 2,25 -> type omega. 4 pendulum (0;2,25) -> does orbit reach the saddle -> omega 2, slider t 10. 5 free: pendulum (1,0).

## Numbers and sources
Probe (`probe.txt`): N tau -7, delta 10, Delta 9, lambda -2,-5; E forward 0,34 s/backward 10 s, N reversed; saddle tau 0 delta -1 Delta 4, seeds (1;0,05) 1,4/4,4 s, (0,05;1) 4,4/1,4 s; C sweep 0 (Delta 1), 0,25 (degenerate, delta 12,25, lambda -3,5), 0,5 (spiral, delta 12,5, Delta -1, -3,5 +- 0,5 i); d=-0,25 spiral tau -0,25 Delta -3,9375; centre tau 0 delta 1 Delta -4; pendulum H -0,540302, 0,416147, 0,805, 1 (exact), 1,53125 (stops 2,76 s), (0,05;2) H 1,00125 stops 8,62/8,66 s; separatrix ends near (+-3,1414; 0,0002) (s1 note).
Arithmetic (node script): 1,01^31,5 = 1,36812; 1,0025^63 = 1,17035; ln 1,3681 = 0,3134, ln 1,1703 = 0,1573; arccos(-0,805) = 2,5065; sqrt(2(1-cos1)) = 0,95885; sqrt(2*1,416147) = 1,683; cos 6,28 = 0,999995, sin 6,28 = -0,00319; x(1) = (0,0496037; -0,0857316) (spec, rechecked by hand); ln 4 = 1,386.
Not probed (stated by theory only): unstable spiral example tau 0,5, delta 1 (step 7); point (-1,0) energy (step 5 PP2); the two-entry readouts of PP2 step 1's linear centre (0 1;-1 0) (type centre by the pendulum linearization row).

## Deviations
Spec step (1) "stable node, predict where a seed goes" became the -E reversal; step 6 states Euler arithmetic (no Euler overlay); no view modes, so every step is "predict the effect of a change, then make it"; no worked example in steps 1-5 (it would show the answer before the observation); period of the pendulum not quoted (not probed); `pp1-types` and `pp2-classes` (full theorems) sit only on the free steps.

## Still to do / doubts
Lesson `title`/ids vs registration; PP2 step 4 `Separatrisa` curve wording not captured from the board; check "Dodaj začetno točko" is a button in the lesson workspace; quarter-unit typed values `0,25`; run checks 3 and the notation test.

## Slice 2b (partial, stopped at HANDOFF; no tests added yet)
Done:
- Probe of every PP1/PP2 opening and learner change, sl and en: `.command-logs/pp-a/probe2-sl.txt`, `probe2-en.txt` (en file also repeats sl; the en part starts at `===== en`). Temporary probe test deleted.
- `lessonMathNotation.test.ts`: PP1/PP2 imported, added to `lessonSets`, `'phase-portrait'` twice in the expected-id list, and `'phase-portrait'` added to `DECIMAL_COMMA_LATEX_LESSONS` (NOT run yet; run `just unit src/learning/content/lessonMathNotation.test.ts`).
- `phasePortraitsGuidedLessons.test.ts`: unchanged (imports briefly edited and restored). Header comment of the lessons file NOT yet updated (PP1-PP2 present, PP3 later).
Probe findings (all observed, no false claim found, no lesson text changed):
- Real controls work in the lesson workspace: matrix fields by label, seed x/y and theta/omega fields, "Dodaj začetno točka" button (seed count), System chooser (pendulum keeps matrix and seeds), time slider typed 6.28 -> time 6.28 and 10 -> time 10 with status "Konec izračunanih trajektorij: čas 10 s".
- Unprobed claims now observed: PP1 step 7 (0,5 -1; 1 0): tau 0,5 delta 1 Delta -3,75, unstable spiral; a=1 rest 0: "premica ravnovesnih točk"; PP2 step 5 (-1,0): H = -0,540302 (same as (1,0)); (0,05;2): H 1,00125 rotation, stopped 8,62 s / 8,66 s; (0;2) H=1 "točno na separatrisi", computed 10 s both ways; (0;2,25) H 1,53125 stopped 2,76 s both; PP1 c=0/0,25/0,5 readouts and types as quoted; centre d=0 as quoted; saddle seeds 1,4/4,4 s as quoted.
- Openings revealing an answer: none. (Opening states answer no prompt: E opens before -E; c=-2 before the sweep; spiral before d=0; linear centre before the pendulum H; (0;1,9) before omega 2.) Each learner change alters the readouts/state of its opening.
- Observed in PP2 pendulum scenes: matrix stays the demo default N in the state (hidden), linearization row says centre, "Ni hiperbolična".
Not done: the new tests (sweep, quote recomputation, control-label existence, not-already-answered), red/green logs, `just unit` run, tsc, backslash check. Design for the successor: independent RK4 (step 0,02, box half-width 4) exit times for the seed rows, quadratic-formula eigenvalue numbers vs `[data-readout="eigen"]`, H = w^2/2 - cos t vs `energy-n`, Euler iteration radii 1,3681 / 1,1703, cos/sin 6,28, separatrix end by RK4 flow; control references via `getByLabelText`, `[data-readout] dt`, `button` name, select options, `[data-phase-status]`, inset aria-label.

## Slice 2c (partial, stopped at HANDOFF; NO test code in the repo)
`phasePortraitsGuidedLessons.test.ts` is unchanged (imports/header edits reverted). The ~330-line PP1/PP2 test block was written but the append failed (ENAMETOOLONG: heredoc too long in one Bash call) and is lost; no red/green logs, no unit/tsc run.
Design to reuse (all checked against the lesson text, brief-s2c.md items 1-5):
- Append as separate small chunks (Write a temp file, `cat >>`), imports: `fireEvent, screen` (RTL), `PhasePortraitGraph`, `enterNumber` from `../../inputs/testEntry`, `linearSystemLesson, pendulumLesson`. Existing top-level names to avoid: f, orbit, q, prose, hasQuote, numbersIn, readout, lessons, stepOf, allSteps, Language.
- Mount `createGraph('phase-portrait')` + `mountGraph`; scene = restoreState(checkpoint) then `sceneActions(step.scene)`; readouts `[data-readout="id"] dd` (ids time, type, tau, delta, discriminant, jacobian, hyperbolic, eigen, view, seed-n, energy-n), `[data-phase-status]`, `[data-phase-inset]` aria-label.
- Independent: own RK4 step 0,02, exit = first step with |x| or |y| > 4 (time k*0,02, matches kernel rk4.ts:81), 10 s complete; classification by tau, delta, Delta; eigen order larger real first; H = w^2/2 - cos t, 6 digits; seed row `(x; y): naprej ..; nazaj ..`; compare after replacing U+2212 by '-'.
- Learner changes through controls (`getByLabelText`, text field typed with the language decimal, range with a point; `Dodaj začetno točko` button; System select value `pendulum`).
- Quotes to verify (sl and en): tau/delta/Delta/eigs of E, N, diag(1,-1), c = 0, 1/4, 1/2, near-centre, centre, (0,5 -1; 1 0); exits 0,34 / 1,4 / 4,4 / 2,76 / 8,62 / 8,66; x(1) = (0,0496; -0,0857) (closed form and RK4); cos/sin 6,28 = 1,0000 / -0,0032; Euler radius 1,3681 (h 0,1, n 63) and 1,1704 (h 0,05, n 126: 1,0025^63 = 1,17035, rounds to 1,1704 not 1,1703), ln 0,3134 / 0,1573; H -0,540302, 0,416147, 0,805, 1, 1,53125, 1,00125; omega max 0,9589 and 1,683; theta max acos(-0,805) = 2,51 (RK4 cross-checks); separatrix end 2 asin tanh 10 = 3,1414, 2/cosh 10 = 0,0002.
- Names check (prefix of graph string, per language): found by reading en.ts: the en prompts write "Type of linearization" (graph: "Type of the linearization: ...", status) in PP2 step 1 and "End of computed trajectories" (graph: "End of the computed trajectories") in PP2 step 4. Likely wording mismatches in `phasePortraitsGuidedLessons.ts` en text (PP2 step 1 observationPrompt, PP2 step 4 observationPrompt/expected); not fixed, not yet confirmed by a run. All sl names match.

## Slice 2d (content tests for PP1/PP2; tests only)
`src/learning/content/phasePortraitsGuidedLessons.test.ts` (imports edited, tests appended from the `PP1 and PP2 open on a real PhasePortraitGraph` describe to the end; helpers `mountPhase`, `PP_VARIANTS`, `PP_NAMES`, `flowOf` (own RK4, step 0,02, box 4), `matrixInfo`, `QUOTES`).
- Part A: scene sweep in sl and en (out of order, twice in one act, restore returns the free state); every prompt-named control/readout name exists in the graph strings and the DOM; no variant of the learner change leaves the snapshot equal to the opening.
- Part B: independent closed forms and RK4 (x(1), cos/sin 6,28, Euler radii, ln values, omega max, extreme theta, separatrix end, exit times); every quoted value present in the sl and en text; graph readouts after each learner change match (tau, delta, Delta, eigenvalues, type, H, exit times, status).
- Red: `.command-logs/pp-a/s2d-red.log` (sl `1{,}683` changed to `1{,}684`, failed, restored). Green log `.command-logs/pp-a/s2d-unit.log`: 188 passed, 1 failed (below). `npx tsc --noEmit` clean.
- One red test left on purpose: en text of PP2 step 5 observationPrompt (`phasePortraitsGuidedLessons.ts:532`) says "Add the start point" but the button/graph string is "Add a seed" (sl matches: "Dodaj začetno točko"). Fix: en prompt to "Press Add a seed, set the start point ...".
- Not checked against the graph: the end position of the Euler/RK4 square at t = 6,28 and the separatrix end at t = 10 (the readouts print no end positions; independent RK4 and closed forms only). The earlier suspected mismatches "Type of linearization" / "End of computed trajectories" do not occur (names match).

## Slice 3: chapter join and wiring (worker)

### Written
- `phasePortraitsChapterRegistry.ts`: sections `linear-system` (`phase-portraits-linear-system`) and `pendulum` (`phase-portraits-pendulum`) on `phase-portrait`, first in order. `phasePortraitsChapter.ts`: two sections (title, formula, example, four paragraphs, investigation prompt), `purpose` and `prerequisites` widened to phase planes, prerequisite link `linear-maps#eigen-directions`. Examples use matrices and starts the lessons do not (A = (0 1; -2 -3); starts (0,1) and (0,3)); no lesson prediction is answered.
- Wiring: `guidedLessonOwnership.ts` (`'phase-portrait'`), `guidedExamplePreviewCopy.ts` (one row `'phase-portrait'`, keyed by Demonstration, so PP2's preview shares PP1's text, as PP5 shares PP4's), `graphs/dynamics/registration.ts` (no `lesson: false`), `LearningPage.tsx` unchanged (topicPreviews has one entry per chapter).
- Tests: `registrationComposition.test.ts`, `familyChapters.test.ts` (min 4, pending list), `authoredChapterCoverage.test.ts` (177 -> 179, expected ids), `lessonLookup.characterization.test.ts` (list, rows PP1, PP2), `lessonCatalog.test.ts`, `lessonSmokeCoverage.test.ts` (new `extraLessonRows` for the PP2 row). Smoke rows `phase-portrait` (7 steps, minFrames 15) and `phase-portrait-pendulum` (5 steps, minFrames 10, example-id path); unified minimum 4. Docs: localization row, task status.

### Outcome
- Red: `s3-red.log` (4 files, 7 tests failed before the source edit). tsc clean (`s3-tsc.log`). `just unit src/learning src/graphs/dynamics` (`s3-unit.log`): 2 failed. (a) `lessonSmokeCoverage`: my row id; fixed, passes (`s3-unit2.log`). (b) `phasePortraitsGuidedLessons.test.ts` "chapter prose quotes the numbers": hard-codes section indices `[0, 1]` for PP4 and PP5, now `[2, 3]`; file is outside my paths, NOT fixed. Scripts tests 57/57 (`s3-scripts.log`). Build passed (`s3-build.log`). `just smoke-lesson phase-portrait phase-portrait-pendulum`: 4 passed (`s3-smoke.log`; PP1 title regex because the math renders "x ′ = A x").
- Single backslashes: 0 outside `String.raw` formulas; LF.
### Not verified
Full unit rerun after fix (b) and the smoke fix; no PNGs (previews for the new ids image-less); Slovenian prose unread; browser look.
