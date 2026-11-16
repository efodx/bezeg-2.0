# F3 randomness Batch C, slice 1: opening probe (RS5 Markov, RS6 intervals)

No action change was needed: `set-run` already takes `markovA`, `markovB`, `markovStart`, `sampleSize`. A temporary host test (deleted) drove the graph through the actions in sl and en. Full output (171 openings per language, with state, every readout row, status, notes, playback buttons, board window, every curve and text) is in `.command-logs/rand-c/probe.txt` (headers `--- sl markov A30 B60 start A seed42 n=100`, `--- sl interval sample36 seed42 n=20`, ... plus `AFTER REPLAY` and `AFTER REPLAY+NEXT` variants; en from the line `===== en`). Layout measurements: `.command-logs/rand-c/probe-layout.txt` (headers `--- <lang> <W>x<H> <opening>`). Run log: `.command-logs/rand-c/probe-run.log` (passed).

`git status --short` after deleting the probe (the two modified files belong to the other worker; nothing under `src/`):

```
 M docs/reviews/randomness/guided-example-inventory.json
 M scripts/generate-guided-example-inventory.cjs
```

## Observed

### Markov (seed 42, A 30, B 60, start A)
- `set-mode markov` alone opens with n = 10000, shown 10000. n = 0 is not allowed (minimum 1); position 0 is reached with `position: 0` (readouts then show shown 0, share 0, status "Korakov 0 od N, v stanju A 0, delež 0", typical deviation ± 0,5212).
- Readout rows (sl / en): Prikazano / Shown; Seme / Seed; Delež časa v stanju A / Share of time in state A; Stacionarna porazdelitev (A; B) / Stationary distribution (A; B); Druga lastna vrednost / Second eigenvalue; Običajno odstopanje deleža (približno) / Typical deviation of the share (approximately). Status "Korakov 100 od 100, v stanju A 71, delež 0,71." / "Steps 100 of 100, in state A 71, share 0.71."
- The run counts the starting state as step 1 (n = 1 from A: "v stanju A 1, delež 1"; from B: 0). Share by n, start A: n 1..5 all 1 (A visited every time, 100 % in A); 100: 0,71 (71); 1000: 0,66 (660); 10000: 0,6713 (6713); 100000: 0,6638 (66382). These match the spec (0,71, 0,66, 0,6713).
- Stationary always "0,6667; 0,3333", second eigenvalue "0,1" (= 1 - a - b), from the first frame and at position 0. Typical deviation: n=1 ± 0,5212, 2 ± 0,3685, 3 ± 0,3009, 4 ± 0,2606, 5 ± 0,2331, 100 ± 0,0521, 1000 ± 0,0165, 10000 ± 0,0052.
- Start B (markovStart 1): shares n=1..5: 0, 0,5, 0,6667, 0,75, 0,8 (in B first, then 1, 2, 3, 4 steps in A); 100: 0,7; 1000: 0,659; 10000: 0,6712. Same stationary and eigenvalue rows. Caption names the start: "Stanje B (začetek)", curve caption "Verjetnost stanja A po k korakih, začetek v B".
- Exact distribution after k steps: there are NO bars. The graph draws a line "Verjetnost stanja A po k korakih, začetek v A/B" (curve `s_{d}`, dashed, one point per `curveCounts(n)` count k >= 1, log x axis, y 0,7 at k=1 for start A and 0,6 for start B, falling to 0,6667) next to the running share (solid green, `s_{e}`, cut at the shown position) and the stationary line (`s_{c}`, grey dotted, y 0,6667). The exact curve and the stationary line are drawn for the whole run at every playback position, also at position 0, and no readout gives P(A after k) as a number. The spec's 0,7, 0,67, 0,667 ... are not shown as numbers anywhere.
- The x-axis title is "Število poskusov (logaritemska os)" / "Number of trials (logarithmic axis)" although the Markov unit is steps.
- Other a, b (n=100 / 10000): (10, 10): stationary 0,5; 0,5, eigenvalue 0,8, share 0,72 / 0,5051 (slow); (50, 50): 0,5; 0,5, eigenvalue 0, 0,46 / 0,5008; (5, 95): 0,95; 0,05, eigenvalue 0, 0,98 / 0,9534; (95, 5): 0,05; 0,95, eigenvalue 0, 0,02 / 0,0466; (80, 90): 0,5294; 0,4706, eigenvalue −0,7, 0,54 / 0,5295. The second eigenvalue is a readout row everywhere, so the speed of settling is stated (0,8 slow, 0 immediate, −0,7 oscillating).
- Edge cases (readout row, note under the list, quoted):
  - A 0, B 0: stationary "ni enolična" / "not unique", eigenvalue "1", typical deviation "—", share 1 (stays in A at start A). Note sl "Veriga ostane v začetnem stanju, zato stacionarna porazdelitev ni enolična." en "The chain stays in its starting state, so the stationary distribution is not unique." Stationary line not drawn (`s_{c}` empty); exact curve flat 1; caption values "A → B: 0", "A → A: 1".
  - A 100, B 100: stationary "0,5; 0,5", eigenvalue "−1", typical "± 0", share 0,5 (5000 of 10000). Note sl "Veriga izmenjuje stanji, zato se delež časa ustali, verjetnost stanja A po k korakih pa ne." en "The chain alternates between the states, so the share of time settles but the probability of state A after k steps does not." The exact curve alternates 0 and 1 (y range [0,1]). Neither "period 2" nor "perioda" is written; only "izmenjuje" / "alternates" and the eigenvalue −1.
  - A 0, B 50 (absorbing A): stationary "1; 0", eigenvalue "0,5", typical "± 0", no note. Start A: share 1. Start B (n 10000): share 0,9999 (leaves B in 1 step by chance 1/2, then stays).
  - None of the three divides by zero (no NaN/Infinity in the text).
- Playback: buttons "Ponovi | Predvajaj | Naslednji korak" / "Replay | Play | Next step" are shown in all 171 openings, none disabled. Replay sets shown to 0 and keeps n, seed, a, b, start; Next then gives shown 1 (readouts "Prikazano 1 od N"). Stops 0, 1, 2, 5, 10, ... as in Batch A.

### Interval (seed 42, sample 36)
- `set-mode interval` opens with n = 100, shown 100. Readouts (sl / en): Prikazano / Shown; Seme / Seed; Intervalov, ki zgrešijo / Intervals that miss ("2 od 100"); Delež zgrešenih intervalov / Share of intervals that miss ("2 %"); Delež zgrešenih po zakonu / Share that miss by the law ("5 %"); Pričakovano zgrešenih / Expected misses ("5 ± 2,2"); Polovična širina intervala / Half-width of an interval ("9,4296"). Status "Intervalov 100 od 100, zgrešenih 2." The coverage 0,95030 is never written; only the rounded miss share by the law.
- n=1: 0 od 1, expected "0 ± 0,2". n=20: 0 od 20, expected "1 ± 1". n=100: 2 od 100 (intervals 21 and 28; `s_{e}` y [21, 28], amber, as in the spec). n=10000: 524 od 10000, share "5,2 %", expected "497 ± 21,7"; first 100 intervals drawn only ("Narisani prvi intervali: 100"; en "First intervals drawn: 100"); the two misses within them are still the same two. Law panel for 10000: "Zgrešenih med 10000 intervali po zakonu (prikazano od 388 do 606; merilo: najvišji stolpec)".
- Drawing: true-mean line at 49,5 (`s_{c}`, dashed grey) captioned "Prava sredina" / "True mean"; hit intervals green, missed intervals amber with an X flag at the right edge captioned "Zgreši" / "Misses"; exact law of misses among the shown intervals as dashed blue bars (right panel, scaled to the tallest bar) and the observed count as a solid green vertical line, captioned "Ta poskus: 2 zgrešenih (polna črta)" / "This run: 2 misses (solid line)". The law panel is drawn from shown >= 1; at position 0 (and `shown` 0) the intervals, the law and the observed line are all empty (only the mean line and the captions "Prava sredina", "Zgreši", "Narisani prvi intervali: 0").
- The count in the law panel follows the shown count: n=20 law over 20 intervals ("prikazano od 0 do 20"), n=100 over 100 (0..16).
- Other sample sizes (seed 42): 16, n=100: 6 od 100, "6 %", law "4,9 %", expected "4,9 ± 2,2", half-width 14,1444; n=10000: 544, "5,4 %", expected "491,7 ± 21,6". 100, n=100: 10 od 100, law "5 %", half-width 5,6577; n=10000: 529 ("5,3 %"), expected "500,1 ± 21,8". Intervals are narrower for 100 (x 38,8..60,5 of 100 plotted) and wider for 16 (22,6..77,0).
- Seeds at sample 36: seed 43: n=20: 3 od 20 (15 %), n=100: 10 od 100 (10 %); seed 7: n=20: 1 od 20 (5 %), n=100: 6 od 100 (6 %). Seed 42: n=20: 0 od 20.
- Playback: same three buttons, none disabled; Replay keeps seed, n, sampleSize and goes to shown 0; Next gives 1.

## Which readouts reveal the predictions at once
- RS5 step 1 ("where does the walker spend more time"): any opening at position > 0 or at position 0 shows the stationary row "0,6667; 0,3333" and the dashed stationary line from the first frame, so step 1 is answered at once, as are step 4 (limit from B: same stationary row and line) and step 5 (new a, b: the row follows a, b immediately). To predict, the opening must have different a, b or the prompt must be about the first steps (n = 1..5 with the share row), and the stationary row cannot be hidden: it is in the readout list for every state. The caption "A → B: 3/10" / "B → A: 3/5" in the diagram states the probabilities (the transition fractions) from the first frame.
- RS5 P(A after k): only an unlabelled curve, numbers 0,7, 0,67 ... not readable; a prediction of them is not answered by a readout.
- RS6 step 2 ("how many of 20 intervals miss"): any opening with shown > 0 states it at once in the "Intervalov, ki zgrešijo" row, the status, the law panel line and the amber intervals; the expected row "1 ± 1" and the law bars also name the expected 1. Open at position 0 to keep it hidden (the expected row reads "0 ± 0" and the law panel is empty at position 0).
- RS6 step 3 (misses of 100): same, the openings n=100 state "2 od 100" at once; open n=100 at position 0, then Next/Play. The expected row "5 ± 2,2" and the exact law bars are visible for any shown >= 1.
- The coverage 95 % is never a readout; the spec's "5 %" appears only as "Delež zgrešenih po zakonu: 5 %".

## Layout
Measured as `SimulationGraph.test.tsx` does (glyph box estimate, canvas set through `clientWidth` etc.), boards 600 x 400 (the host test), 390 x 520, 330 x 520 (the existing layout tests' narrow size).
- Interval: no problems at all three sizes, sl and en, n=1 sample 16, n=100, n=10000 sample 36 and 100 (largest): every caption inside the board and clear of curves; the intervals (y 61..353 of 400, 74..466 of 520) and the law panel (x 291..583 at 600; 189..379 at 390) are inside. The law caption wraps over several rows at 390 and 330, finishing at y 70 (390) before the bars start (y 153); "Ta poskus ..." wraps to y 108. Nothing overprints.
- Markov, the owed overflow (reproduced): at 390 x 520 the diagram boxes span x 56..155 (left, 99 px) and the captions "Stanje A (začetek)" stand at x 62..192 (130 px) and "State A (start)" at 62..170: the caption is wider than its box (by about 37 px sl, 15 px en); at 330 the left box is 47..131 and the caption 53..182 (about 50 px over). At 600 x 400 the box is 86..238 and the caption fits (96..225 sl, 96..204 en). n=100000 and A/B changes give the same boxes. The right box caption "Stanje B" fits. The transition captions "A → B: 3/10" x 158..237 fit between the boxes at 390, but touch the arrow lines in the estimate at every size (they sit on the arrows).
- Markov at 390 x 520: the second caption row ("Verjetnost stanja A po k korakih, začetek v A") reaches x 386 of 390 in sl (inside by 4 px) and wraps in en ("Probability of state A after k steps, starting in A" x 62..386, estimated to wrap) so the estimate overlaps it with the third row "Stationary distribution"; sl overlaps the same at n=100 (the plot is wider there) and at 330. At 330 x 520 the axis title "Število poskusov (logaritemska os)" ends at x 352 (past the board's 330), sl and en. The diagram itself (curves) lies inside the board at both 390 (x 56..356) and 330 (x 47..302).
- Not measured: a real browser render (the estimate is the existing tests' own); the overlap of the arrow lines with the captions is by the glyph estimate only.

## Doubts
- The spec prints the miss share as "5,24 %" and the law share as 0,04970; the graph shows "5,2 %" and "5 %" (one decimal, one digit for the law). RS6 text quoting "4,97 %" or "5,24 %" must either name the numbers itself (and the lesson test check them) or quote the rounded readouts. Same for sample 16 ("4,9 %") and 100 ("5 %", spec 0,94999 → 5,001 %).
- Spec RS5 asks to show P(A after n) = 0,7, 0,67, ... as numbers/bars; the graph shows only a line, no numbers. The lesson must state those numbers in its own formula blocks (the spec's values match the model: the curve starts at 0,7 for start A and 0,6 for start B).
- The Markov x axis is titled "number of trials" although it counts steps; the owed overflow of the state box is a graph drawing issue (task 07: "F3 label item"), outside this probe's paths.
- Sl "1 zgrešenih" / en "1 misses" is not agreed with the singular (the line "Ta poskus: N zgrešenih", "This run: N misses"), a text for the lesson-side wording question; the graph caption would need a plural form.
- A = B = 100 does not say "period 2" in any text (note: "alternates"; eigenvalue −1); the spec's acceptance 4 asks for period 2 / eigenvalue −1 named: eigenvalue −1 is named, the period is not.
- n = 0 is not allowed; position 0 does the job.

## Graph slice (handler 34)
- Rows added (readout ids): interval `exact-coverage` (5 fixed decimals, 0,95083 / 0,95030 / 0,94999 for samples 16/36/100), markov `exact-a` (label with k = shown, value `dec(.,5)` trimmed: 0,7 0,67 0,667 0,6667 0,66667; "—" at position 0). Miss share and law share now two decimals (5,24 % / 4,97 % at seed 42, n 10 000). "Pričakovano zgrešenih" left as is (one decimal, hides nothing here).
- New keys sl/en: `random_graph_r_exact_coverage`, `random_graph_r_exact_a` ("Verjetnost stanja A po korakih (točno): k = {value0}" / "Probability of state A after k steps (exact): k = {value0}"), `random_graph_cap_log_axis_steps` ("Število korakov (logaritemska os)" / "Number of steps (logarithmic axis)", markov only).
- Changed texts: `cap_miss_run` "Ta poskus: zgrešenih je N (polna črta)" / "This run: N missed (solid line)"; `cap_miss_law` "Zgrešenih po zakonu (intervalov: N; prikazano od a do b; …)" / "Misses by the law (intervals: N; shown for a to b; …)"; `cap_box_start` now only "(začetek)" / "(start)" (second line in the start box, state name stays "Stanje A"); `r_note_period` appended "(perioda 2)" / "(period 2)".
- Layout (390x520, 330x520, sl/en, n 100/10 000): before, "Stanje A (začetek)" 130 px in a 99 px box (81 px at 330), axis title ended at x 352-361, caption rows overlapped; after, labels 58 px + marker 65 px on two lines inside the box, markov caption rows stand at the left edge and stack by wrapped height (`plan()` now also for markov), axis title at the left edge. Boxes unchanged (99 / 81 px). Measured by the glyph estimate only; no real browser render.
- Existing tests changed: scene caption order (`box`,`box`,`boxStart`), two key-text asserts in SimulationGraph.test.tsx. Logs: `.command-logs/rand-c/graph/` (red.log, red-layout.log, unit.log, tsc.log, lint.log, build.log); probe: `.command-logs/rand-c/probe-after.txt`.
- Not done: smoke in a real browser; `randomnessPreviewCopy.ts` markov description (not owned) may name the old box captions.

## Slice 2 (LESSON): RS5 and RS6 (checked and repaired, slice 2b)

### Written
- `src/learning/content/randomnessMarkovGuidedLessons.ts`: `rs5Lesson`, constants `RS5_*`, 7 steps (two states; longer run; exact p_k with pi P = pi worked example; start in B; a, b and lambda; edge cases a=b=0 and a=b=100; explore seed 7, a 20, b 40, start B).
- `src/learning/content/randomnessIntervalGuidedLessons.ts`: `rs6Lesson`, constants `RS6_*`, 6 steps (one interval; twenty; hundred with the binomial law; 10 000; sample size 16/100; explore seed 7, sample 25, n 100), worked example P(M<=2) = 0,1208.
- Probe: temporary host test (deleted) wrote `.command-logs/rand-c/probe2.txt` (sl then en; every opening, every post-change state, playback stops 1/2/5, a/b/start/sample/n changes). Probe facts: changing a, b, start, sample size or seed keeps `shown`; typing n shows everything; the exact row `exact-a` reads k = shown (0,7 / 0,67 / 0,66667 at stops 1/2/5 from A, 0,6 at 1 from B, 0,2 / 0,76 / 0,45032 for a80 b90, 0 / 1 / 0 for a=b=100); interval exact rows (coverage, law share, half-width) are shown also at position 0.

### NOT done (no check was run: tsc, backslash scripts, unit, lint, notation test, number table)
- All six checks of the base brief are still to run on both files; the notation test was not run (known risk: any `k = number` or `a+b` outside math in prose; sources text was reworded to avoid them).
- Numbers per step with source are not tabulated; sources are probe2.txt, probe-after.txt, probe.txt, the spec, and arithmetic (P(M<=2) terms 0,0061 / 0,0320 / 0,0827 computed by node, sum 0,1208; 1,96*28,866/6 = 9,4296; 524 is (524-497)/21,7 = 1,2 deviations).

### Deviations and doubts
- RS5 step 4 prompt asks Ponovi then Naslednji korak to show 0,6 at k = 1; RS5 steps 5 and 6 ask the same for the exact row (stops 1, 2, 5).
- Exact row k follows Prikazano, whereas the run counts the start as step 1 (graph convention, not a lesson issue).
- RS6 step 2 prompt suggests seeds 43 and 7 (3 and 1 misses of 20, probe.txt); not probed after a seed change at shown 20 (shown is kept by seed changes at other modes; assumed).
- Step 3 and 4 openings of RS6 differ from the produced state as required; RS6 step 4 opens on the Demonstration default (n 100 shown).

### Test design (for the tests worker)
Scenes via `randomnessSceneActions`; openings: RS5 [markov, a50 b50 n100], [n100], [n100, position 0], [default n 10000], [n100], [n100], [seed 7 a20 b40 start B]; RS6 [n1 pos0], [n20 pos0], [n100 pos0], [default], [n10000], [seed 7 sample 25 n100]. Expected readouts are the `expectedState` texts and the probe2.txt blocks (headers `rs5.N`, `rs6 ...`); learner actions are in each step's observationPrompt. Quote list: every number in expectedObservations/expectedState, source probe2.txt / probe-after.txt.

### Numbers per step with source
Sources: P = `.command-logs/rand-c/probe.txt`, P2 = `probe2.txt`, PA = `probe-after.txt` (each number was found by search in these; the RS5/RS6 location is the step id in the lesson file, sl and en text, expectedObservations and expectedState). A = arithmetic (checked by node).

RS5 (randomnessMarkovGuidedLessons.ts)
- rs5-two-states: 0,71 and 0,0521 (100 steps, seed 42, a 30, b 60) P2; 0,6667 / 0,3333 A (2/3, 1/3); lambda 0,1 = 1-a-b A; a=b=50: 0,46 and lambda 0 P2; stay times 1/0,6 = 1,7 and 1/0,3 = 3,3 A.
- rs5-longer: 0,6713, 0,0052 (10 000 steps), 0,66 and 0,0165 (1000 steps) P/P2.
- rs5-exact: p_1 = 0,7, p_2 = 0,67, p_5 = 0,66667 from A P2; p_5 - 2/3 = (1/3)*0,1^5 = 3,3e-6 A.
- rs5-start-b: 0,6712 (start B, 10 000 steps), 0,6 at k=1 from B P2; 2/3 - (2/3)*0,1 = 0,6 A.
- rs5-rates: a=b=10: 0,5 / 0,5, lambda 0,8, 0,72 (100 steps), 0,5051 (10 000) P2/PA; a 80, b 90: 0,5294 / 0,4706, lambda -0,7, 0,5295 (10 000); exact row 0,2 / 0,76 / 0,45032 at stops 1/2/5 P2.
- rs5-edges: a=b=0: share 1, lambda 1, not unique; a=b=100: share 0,5, lambda -1; exact row 0 / 1 / 0 P2.
- rs5-explore: seed 7, a 20, b 40, start B: 0,6765 (10 000), 0,69 (100), lambda 0,4 = 1-0,6 A/P2.

RS6 (randomnessIntervalGuidedLessons.ts)
- rs6-one-interval: population 0..99, mean 49,5, variance (100^2-1)/12 = 833,25, sigma 28,866 A; half-width 1,96*28,866/6 = 9,4296 A (P readout); coverage 0,95030, law share 4,97 % P; interval covers 49,5 (green), 0 of 1 P. Covering test |S-1782| <= 339 (36*49,5 = 1782; 9,4296*36 = 339,47) A.
- rs6-twenty: 0 of 20 (seed 42), 3 of 20 (seed 43), 1 of 20 (seed 7) P (state n=20 shown=20); 20*0,0497 = 0,99 A; expected 1 +- 1 P. Seed change: code (`editSeed` patches only the seed, `SimulationGraph.tsx:680`) keeps Prikazano, so from the step opening (position 0) a new seed shows the counts after Play; after Play the counts show at once. The text is right as written.
- rs6-hundred: 2 of 100 (intervals 21 and 28), 2 %, 4,97 %, expected 5 +- 2,2 P (2,17 A); q = 1-0,95030 = 0,04970 A.
- rs6-long: 524 of 10 000, 5,24 %, 497 +- 21,7 (sqrt(10000*0,0497*0,9503) = 21,73) A; 524 is (524-497)/21,7 = 1,2 deviations A.
- rs6-sample-size: sample 16: half-width 14,1444, coverage 0,95083; sample 36: 9,4296; sample 100: 5,6577 (1,96*28,866/4, /6, /10) A and P; share by the law 4,97 % P.
- rs6-explore: seed 7, sample 25, n 100 values are read by the learner; quoted ones P2.
- Worked example P(M<=2): 0,0061 + 0,0320 + 0,0827 = 0,1208 (m=100, q=0,0497) A (node).
- Untraced numbers: none.
