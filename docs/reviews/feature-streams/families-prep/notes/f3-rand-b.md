# F3 randomness Batch B, slice 1: set-run fields and opening probe

## Written
- `src/learning/model.ts` (random union, comment): `set-run` gains optional `walkSteps`, `areaShape` ('quarter' | 'disc'), `markovA`, `markovB`, `markovStart` (0 | 1), `sampleSize`.
- `src/graphs/random/SimulationGraph.tsx` `applyRandomAction` set-run: the fields join the allowed list and the merged state; `parseRandomState` validates it whole, as before. Doc comment updated.
- The controls write only the field (`edit({walkSteps})` etc.), so the playback position `shown` stays: the action does the same (only `n` also sets `shown`). A field of another mode is written too.
- `SimulationLessonActions.host.test.tsx`: three tests (action equals control for area/walk/markov/interval on state, readouts, status, drawing; the area-walk synchronous sequence with checkpoint restore; 12 invalid payloads change nothing, message `random set-run: ...`).
- Red: `set-run` allowed list reverted to the old four fields: 3 of 11 fail ("no such field", `host-red.log`). Green: `host.log`. Unit `s1-unit.log`, typecheck `s1-tsc.log`, lint `s1-lint.log` all passed. Probe test deleted. LF verified.

## Observed (probe: `.command-logs/rand-b/probe.txt`, sl and en, every opening)
Board in the host test is 600 x 400 (shim), not 1366 x 768; window per opening is in the probe. All texts lie inside the window.
- Area quarter seed 42: inside 76/779/7833 of 100/1000/10000; estimate 3,04/3,116/3,1332; error -0,1016/-0,0256/-0,0084; typical +-0,1642/0,0519/0,0164. All match the spec. n = 1: inside 1, estimate 4, +-1,6422. n = 0 not allowed (N_MIN 1); Replay gives shown 0 (readouts "0 od 0", all 0).
- Drawn: square, arc, pi/4 dashed line, error bar (vertical line plus caps) and the points; only the first 300 points (caption "Prvih 300 točk" / "First 300 points"; inside crosses 407 pts, outside 1391 pts at n >= 300). Captions: "Četrtina kroga", "Delež točk v krogu (ocena števila π/4)", "Prava vrednost π/4", "Navpična črta: običajno odstopanje ocene", "Velik križec: točka v krogu", "Majhen križec: točka zunaj kroga". Controls: Poskus, Seme, Število točk, Oblika; buttons Naslednji korak, Predvajaj, Ponovi.
- Disc: identical readouts; caption "Cel krog: ista vzorčna četrtina, zrcaljena v štiri četrtine" (en in probe); window [-1,1] square.
- Seed 43: n 100 inside 76 (same as seed 42, estimate 3,04), n 10000 inside 7741, 3,0964, error -0,0452. Seed 7: 77 (3,08, -0,0616) and 7858 (3,1432, +0,0016). The error bar is +-0,0164 for all seeds at 10000. RS3 step 5 at n = 100 shows seed 43 equal to seed 42: use n 10000 or seed 7.
- Walk 100 steps: n 1: rms 10, mean 10, zeros 0 (expected 0,1); walk 1 (seed 42) ends at +10 (curve s_e, last y 10). n 10: rms 10,68, mean 9,4, zeros 0. n 1000: rms 10,31 (by law 10), mean 8,218 (7,9589), zeros 68 (expected 79,6); all match the spec. Drawn: dashed +-sqrt(n) funnel, first 10 walks, running width curve, histogram of end positions and the exact law (dashed) at the right (x 106 to 146). Captions "Prvih N sprehodov", "Običajna širina sprehodov", "Kje se sprehodi končajo", "Pričakovano po zakonu". Window x [-10, 155] (50-wide plot at 100 steps).
- Walk n 1000: 200 steps rms 13,78 (law 14,14), mean 11,086 (11,2697), zeros 56 (56,3); 400 steps rms 19,31 (20), mean 15,52 (15,9477), zeros 34 (39,9); 99 steps rms 10,15 (9,95), mean 8,19, zeros row reads "0 (pri lihem številu korakov se ne morejo končati v izhodišču)". Doubling steps: 10,31 -> 13,78 (x1,34, law x1,41).

## Which readouts reveal the predictions at once
- RS3 step 1 (share inside): the first frame of the area opening at n >= 100 shows "Delež točk v krogu" 0,76/0,779 and the estimate: it answers at once. Open at n = 0 or via Replay (shown 0) to hide it; n = 1 shows share 1.
- RS3 step 4 (shrink factor): "Običajno odstopanje ocene" +-0,1642 and +-0,0164 are both in the readout row: the factor 10 is visible when n is changed, not before.
- RS4 step 1 (end of one walk): n = 1 shows mean distance 10 and rms 10 ("10, po zakonu 7,9589"), so |end| = 10 is stated (the sign is only the drawn curve); the zero row states 0.
- RS4 step 5 (spread after doubling): the rms and mean rows at 200 states the answer with the law value next to it ("po zakonu 14,14"); a prediction before the change is hidden only if the learner has not yet seen 200.

## Doubts
- Captions "Prvih 1 točk" (area n 1) and "Prvih 1 sprehodov" (walk n 1) are ungrammatical in Slovenian (a count form is needed); not changed (outside owned paths, copy decision).
- Probe board is the shim's 600 x 400, so the 1366 x 768 fit is not measured.
- The probe prints board curve layers by name only (s_c ... s_i); the layer-to-caption mapping above is inferred from caption order and ranges, not read from the scene.
- Not smoke-tested in a browser.

## Slice 2 (LESSON): RS3

### Written
- `src/learning/content/randomnessAreaGuidedLessons.ts` (new): `rs3Lesson` (`prob-simulation`, 6 steps, sl + en), scene constants `RS3_EMPTY_SQUARE`, `RS3_HUNDRED_POINTS`, `RS3_ERROR_SCALE`, `RS3_TEN_THOUSAND_POINTS`, `RS3_WHOLE_CIRCLE_START`, `RS3_EXPLORE`; two formulas (`mc-share`, `mc-se`), one worked example (`rs3-se`, n = 100 only, so it does not give the step 3 answer). Imports `randomnessSceneActions` from `randomnessGuidedLessons.ts`; no shared file touched.
- Probe 2 (temporary host test, deleted): `.command-logs/rand-b/probe2-rs3.txt` (sl + en).
- Learner-set values are stated in the following step (the observation prompt is rendered before the change; `expectedObservations` are not rendered).

### Numbers per step with source (P = probe.txt, P2 = probe2-rs3.txt)
| Step | Opening (scene) | Learner change | Numbers quoted | Source |
| --- | --- | --- | --- | --- |
| 1 | area, seed 42, n 100, position 0 (readouts 0, "0 od 0") | Predvajaj / Naslednji korak to 100 od 100 | 76, 0,76, 3,04, -0,1016, +-0,1642 | P area 100; P "AFTER REPLAY", P2 pos0 |
| 2 | n 100 all shown | Število točk = 10000 | 76, 3,04, -0,1016; then 7833, 0,7833, 3,1332, -0,0084, +-0,0164, 300 drawn | P; P n 10000 |
| 3 | n 100 (+-0,1642) | n = 1000, then 10000 | worked: 4*sqrt(0,7854*0,2146/100) = 0,1642; 779, 3,116, +-0,0519; 3,1332, +-0,0164 | arithmetic (0,7854*0,2146 = 0,16855; sqrt(0,0016855) = 0,04105); P n 1000, 10000 |
| 4 | seed 42, n 10000 | Ponovi, Predvajaj; seed 7, 43 | 0,1642/0,0164/0,0519; 3,1332; seed 7: 7858, 3,1432, +0,0016; seed 43: 7741, 3,0964, -0,0452, 2,8 x (0,0452/0,0164 = 2,76) | P seed 7/43 n 10000 |
| 5 | seed 42, n 1000, quarter | Oblika = Cel krog v kvadratu | 779, 3,116, -0,0256, +-0,0519; whole-circle readouts equal | P n 1000, P disc n 1000, P2 |
| 6 | seed 7, n 1000, disc | free | 774, 0,774, 3,096, -0,0456, +-0,0519 | P2 |

Mechanics confirmed from code (`SimulationGraph.tsx` 478-565): typing n sets shown = n; changing the seed or the shape keeps shown; Ponovi sets shown 0 without playing; Predvajaj at shown = n restarts from 0.

### Deviations
- Step 5 opens on the quarter at n = 1000 (not n = 100) so that the learner-visible readouts are the ones the explore step later changes by seed only.
- Step 3 asks two settings (1000 then 10000) in one prompt; step 4 asks replay, seed 7, seed 43 in one prompt.
- The second shape sits in step 5 with the explanation of mirroring deferred to step 6 (the caption shows it at once).

### Test design (for the tests worker)
- Scenes: apply `randomnessSceneActions(id, spec)` for each step scene; check the state after the scene and after the learner action.
- Opening states: step 1 `{mode area, seed 42, n 100, shown 0}`, readouts shown "0 od 100", inside "0 od 0", estimate 0. Step 2 and 3 `{n 100, shown 100}`: inside "76 od 100", estimate 3,04, error -0,1016, typical "± 0,1642". Step 4 `{n 10000, shown 10000}`: 7833 od 10000, 3,1332, -0,0084, ± 0,0164. Step 5 `{n 1000}`: 779 od 1000, 3,116, -0,0256, ± 0,0519. Step 6 `{seed 7, n 1000, areaShape disc}`: 774 od 1000, 3,096, -0,0456, ± 0,0519.
- Learner actions to check: set n 10000 from step 2 (shown = n); n 1000 and 10000 from step 3; step 4 `set-position 0` then playback stops (0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000) and seed 7 (7858, 3,1432, +0,0016) and 43 (7741, 3,0964, -0,0452) with shown kept at 10000; step 5 `set-run areaShape disc` keeps all readouts.
- Quote list: every number in the table above; en uses a decimal point (`3.04`).
- `lessonMathNotation.test.ts`: needs `['randomnessAreaGuidedLessons', [rs3Lesson]]` in `lessonSets` and one more `'prob-simulation'` in the demonstration-id list (done temporarily, green, reverted).

### Checks
tsc `s2-tsc-rs3.log` clean; backslash `s2-backslash-rs3.txt` 0 singles; lint `s2-lint-rs3.log` clean; unit `src/graphs/random` green (`s2-unit-rs3.log`); notation green with the temporary list edit (`s2-notation-rs3.log`), file reverted (diff empty). Not run: browser smoke, screenshot at 310 px, tests for the lesson itself.

### Still to do
Registration in the chapter/registry/preview/test lists (slice 3); a content review of the Slovenian wording.

### Doubts
- Step 1 opening shows the pi/4 line from the first frame (always drawn), so the share is visible before the prediction; the prompt asks for the computation and the count, the line cannot be hidden.
- "Metoda Monte Carlo, ocenjevanje z naključnimi poskusi" is my gloss, not from the spec Terms table.
- The worked-example latex shows rounded intermediate values with `\approx`.

### Handler 33: RS3 review applied (`.command-logs/rand-b/review-rs3.md`)
- Summary states the topic only. Step 1 names the drawn "Prava vrednost π/4" line and asks to justify its value from areas, then predict the count of 100; readouts at position 0 are "0".
- **Test design change:** step 2 (opening n = 100) now shows formula `mc-se` and worked example `rs3-se` and asks for the typical deviation at 10 000 (learner types 10000: 7833, 3,1332, −0,0084, ±0,0164). Step 3 opens at n = 10 000 (`RS3_ERROR_SCALE` = n 10000) and asks for 1000 (learner types 1000: 779, 3,116, ±0,0519, √10 ≈ 3,16). Step 4 asks replay and seed 7; seed 43 optional ("redek primer"). Step 5 explanation says the disc mirrors the same quarter sample.

## Slice 2 (LESSON): RS4

### Written
- `src/learning/content/randomnessWalkGuidedLessons.ts` (new): `rs4Lesson` (`prob-simulation`, 6 steps, sl + en), scenes `RS4_ONE_WALK_NOT_DRAWN`, `RS4_ONE_WALK`, `RS4_TEN_WALKS`, `RS4_PARITY_START`, `RS4_DOUBLING_START`, `RS4_EXPLORE`; formulas `walk-sqrt` (variances add, sqrt n), `walk-law` (S = 2K - n, shifted binomial); worked example `rs4-zero` (P(S_100 = 0), 79,6, deviation 8,6; step 3). Imports `randomnessSceneActions` from `randomnessGuidedLessons.ts`; no shared file touched.
- Probe 2 (temporary host test, deleted): `.command-logs/rand-b/probe2-rs4.txt` (sl + en): n 1 at position 0 (readouts 0 "po zakonu 10"; Naslednji korak gives shown 1; Predvajaj does not advance under the fake clock), n 1 to 10 typed, n 10 to 1000 typed, 1000 to 99 steps typed, 100 to 200 steps typed, seed 7 with 400 and with 100 steps. Typing n sets shown = n; typing steps keeps n and shown.
- Checks (all `.command-logs/rand-b/s2-*-rs4.*`): typecheck, backslash checks (0 singles), lint, `just unit src/graphs/random`, notation test (temporary entry, green, `lessonMathNotation.test.ts` reverted, diff empty) all passed.

### Numbers per step with source (P = probe.txt, P2 = probe2-rs4.txt)
| Step | Opening (scene) | Learner change | Numbers quoted | Source |
| --- | --- | --- | --- | --- |
| 1 | walk, seed 42, 100 steps, n 1, position 0 (shown 0 of 1, readouts 0, "po zakonu 10", "7,9589") | Predvajaj / Naslednji korak | 1 walk ends +10, mean distance 10, rms 10, zeros 0 | P walk n 1; P2 |
| 2 | n 1 shown | Število sprehodov = 10 | +10, 10; then rms 10,68 (10), mean 9,4 (7,9589), zeros 0 (0,8) | P walk n 10; P2 |
| 3 | n 10 | n = 1000 | 10,68, 9,4; sd 100 -> 10 (arithmetic); C(100,50)/2^100 = 0,0796, 79,6, sqrt(1000*0,0796*0,9204) = 8,6 (arithmetic: 0,0796*0,9204 = 0,07327; *1000 = 73,3; sqrt 8,56); then 10,31 (10), 8,218 (7,9589), 68 (79,6) | P n 10, n 1000; spec 89 |
| 4 | n 1000, 100 steps | Korakov na sprehod = 99 | 10,31, 8,218, 68, 79,6, 8 %; then 10,15 (9,95), 8,19 (7,9589), zeros 0 with odd-steps note | P n 1000, steps 99 |
| 5 | n 1000, 100 steps | steps = 200 | 99 steps: 10,15, sqrt 99 ≈ 9,95; 10,31, 10; then 13,78 (14,14), 11,086 (11,2697), zeros 56 (56,3) | P steps 99, 200 |
| 6 | seed 7, 400 steps, n 1000 | free | step 5 numbers; 13,78/10,31 ≈ 1,34 (arithmetic 1,3366); sqrt 2 ≈ 1,41; sqrt(200)/sqrt(100) = sqrt 2; opening 18,99 (20), 15,174 (15,9477), 45 (39,9) | P2 seed 7 steps 400 |

### Deviations
- Step 2 does not state the sqrt n argument (the brief puts it in step 2): the explanation of step 2 would give the answer to its own prediction, so the variance argument, the exact sd and the law sit in step 3 (explanation, formulas) and step 3 predicts the zero count and whether the rms is exactly 10. The funnel is named in step 2 only as "Običajna širina sprehodov"; the readouts "po zakonu 10" are on the first frame (settled by handler).
- Step 3 predicts a range for the zero count (the worked example states the expectation 79,6 with deviation 8,6) and "exactly 10 or near 10", not a single number.
- Parity: the formula `walk-law` omits the odd-n statement and step 4 shows no formula, so step 4's answer is not rendered before the prediction; the parity argument is in step 5's explanation.
- The overlay (second seed) is not used. The 400-step run is only the exploration opening.
- Step 2 explanation says "prvih nekaj sprehodov" (drawn), not 10; the probe prints the caption count only at n 1 and 10.

### Test design (for the tests worker)
- Scenes: `randomnessSceneActions(id, spec)`; check state and readouts after the scene and after the learner action. Add `['randomnessWalkGuidedLessons', [rs4Lesson]]` to `lessonSets` and one more `'prob-simulation'` in the demonstration-id list of `lessonMathNotation.test.ts` (done temporarily, green, reverted).
- Openings (all seed 42, 100 steps, mode walk): step 1 `{n 1, shown 0}` readouts shown "0 od 1", rms "0, po zakonu 10", mean "0, po zakonu 7,9589", zeros "0, pričakovano 0"; step 2 `{n 1, shown 1}` rms "10, po zakonu 10", mean "10, po zakonu 7,9589", zeros "0, pričakovano 0,1"; step 3 `{n 10}` "10,68, po zakonu 10", "9,4, po zakonu 7,9589", "0, pričakovano 0,8"; steps 4 and 5 `{n 1000}` "10,31, po zakonu 10", "8,218, po zakonu 7,9589", "68, pričakovano 79,6"; step 6 `{seed 7, n 1000, walkSteps 400}` "18,99, po zakonu 20", "15,174, po zakonu 15,9477", "45, pričakovano 39,9".
- Learner actions: step 1 `set-position 1` (shown 1, readouts as step 2 opening); step 2 `set-run n 10` (shown 10); step 3 `set-run n 1000`; step 4 `set-run walkSteps 99` (n and shown 1000; rms "10,15, po zakonu 9,95", mean "8,19, po zakonu 7,9589", zeros "0 (pri lihem številu korakov se ne morejo končati v izhodišču)"); step 5 `set-run walkSteps 200` ("13,78, po zakonu 14,14", "11,086, po zakonu 11,2697", "56, pričakovano 56,3"). en uses a decimal point and "by the law", "expected".
- Quote list: every number in the table; the 8,6 and 8 % are arithmetic (0,0796 = 8 % rounded).

### Still to do
Registration in the chapter, registry, preview and test lists (slice 3); a content review of the Slovenian wording.

### Doubts
- Step 1 opening shows the funnel and the law readouts ("po zakonu 10") from the first frame, so step 1's answer is in the picture; the prompt asks for the prediction first (handler-settled).
- "Povprečje razdalje od izhodišča" at n 1 is the distance of the end; the sign (+10) is only the drawn walk (curve end), not a readout.
- Step 3 explanation uses "Konci torej niso blizu ±100" after ten walks (mean distance 9,4); a single run, stated as such.
- Not smoke-tested in a browser; Play was not probed under a real clock (fake clock does not advance); the 1366 x 768 fit is not measured.

### Handler 33: RS4 review applied (`.command-logs/rand-b/review-rs4.md`)
- **Test design change:** worked example `rs4-zero` moved from step 3 to step 4 (its check text now in the present tense); step 3 asks to predict from the law about how many of 1000 walks end at 0 and whether the rms is exactly 10. Step 3 explanation adds: the mean distance is smaller than √n, by the law 7,9589 at 100 steps, about √(2n/π) ≈ 0,8√n.
- Summary states the topic only; `walk-law` no longer hints parity ("če tak celi k obstaja" removed); step 2 says the "po zakonu" values are computed comparisons, write the prediction first; step 2 prompt "vsi blizu istega položaja".
