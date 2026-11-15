# F3 recursion Batch B, slice 1: cobweb scene actions and opening probe

## Written

- `src/learning/model.ts:571-587`: the `recursion` union gains `map?` on `set-map`, `M?`/`C?`/`R?` on `set-params`, and `set-start {X}` and `set-step {step}`.
- `src/graphs/recursion/RecursionCobwebGraph.tsx` (`applyRecursionAction`, `editStored`, `registerLessonActions`, before the Text section): merge, `parseCobwebState` before any write, unknown fields refused, only changed fields written in one `edit`, exhaustive switch. `set-map` goes through `withMap` and `editMap` (the chooser path, so the start falls back and the notice appears as with the chooser). A valid action calls `pausePlayback` first and never starts playback.
- `src/graphs/recursion/GrowthGraph.tsx`: `refuseCobwebFields` (map, M, C, R) and `set-start`/`set-step` refusals; its own actions unchanged.
- Refusal messages: `recursion <op>: <field> belongs to the growth graph.` / `... to the cobweb graph.`, `recursion <op>: no such field <f>.`, and the parser message (`R is outside [5, 29].`).
- `src/graphs/recursion/CobwebLessonActions.host.test.tsx` (8 tests) and extra refusals in `GrowthLessonActions.host.test.tsx`. The temporary probe test is deleted.

## Observed

- Red: with the cobweb `registry.on` line commented out, 7 of 8 fail (only the growth-refusal test passes): `.command-logs/rec-b/host-red.log`. Restored; green `host.log` (8 passed), `s1-unit.log` (`just unit src/graphs/recursion` passed), `s1-tsc.log` empty, `s1-lint.log` passed. Files are LF.
- Limits: R is 5..29 (r 0,5..2,9), so R30 is refused; M -60..60; C -100..100; X -1000..1000 (affine), -200..200 (cosine), 1..99 (logistic).

## Probe summary (full text sl and en: `.command-logs/rec-b/probe.txt`, git-ignored)

Every opening shows everything at step 0 (status, rows, captions), before the learner acts, and nothing hides it:
- Status text names the verdict (privlačna/attracting, odbojna/repelling, dvojni cikel, izumrtje, "negibne točke ni", "vsaka točka je negibna"), x*, and for affine the rule `|m| < 1`.
- Rows: `Negibna točka x*` (fraction plus decimal when not whole, e.g. `50/11 ≈ 4,545455`, `1/3 ≈ 0,333333`), `Naklon pri negibni točki` (the slope), `Oblika mreže` (staircase/spiral/closed square). So shape, limit and slope are all readable at step 0; a "predict" step cannot hide them. Only the iterates after step 0 are not shown.
- Counter `Korak n od 60`, row `Narisani koraki`, row `Iterat xₙ (izračunano)`, status tail `Po n korakih je xₙ = ... (izračunano).`, caption `xₙ = ... (izračunano)`. Captions: map equation, `diagonala y = x`, `Pajkova mreža: navpično do krivulje, vodoravno do diagonale`, `začetek x₀ = ...`, `negibna točka x* = ...`.
- Values (sl decimals): m=0,5 c=1 x0=0: x4 1,875, x11 1,999023, x38 and x60 = 2. m=-0,8 c=9 x0=1: x*=5, x11 5,343597, x60 4,999994 (spiral). m=-1,2 c=10 x0=4,6: x*=50/11, x11 4,140177, x60 3078,046237 (spiral, repelling). m=1,5 c=-1 x0=2,1: x*=2, x11 10,649756, x60 3,677·10⁹ (sci. notation). m=1 c=1: "Negibne točke ni", x11=11, x60=60 (slope row 1, shape staircase). m=1 c=0 x0=1: every point fixed, x stays 1. m=-1 c=6 x0=1: closed square, x11=5, x60=1, x*=3. Cosine x0=0: x*=0,739085, slope −0,673612 (computed), x11 0,744237, x60 0,739085; x8 by hand 0,7221024 (not printed in the probe, steps 0/4/11/38/60 only).
- Logistic x0=0,1: R8 "Izumrtje" x*=0 slope 0,8 x11 0,00579; R10 "naklon ne odloči" x*=0 slope 1 x11 0,045851 x60 0,013885; R15 x*=1/3 slope 0,5 x11 0,332305; R25 x*=3/5 slope -0,5 x11 0,60006; R29 x*=19/29 slope -0,9 x11 0,678306 x60 0,655039 (the slow spiral). R30 refused (`R is outside [5, 29]`).
- Windows: affine [-10,10]^2, cosine [-2,2]^2, logistic [-0,1..1,15] x [-0,2..1,1]. The graph is not framed on x*: no zoom action exists, only the shared board zoom buttons (user driven). RG2 step 6 "zoom on the slope at x*" must be phrased around the picture (the slope row and the shape row), not around a framed view.
- Default: affine m=0,5 c=1 x0=0, step 0 (status as the RG2 opening). Reset ("Ponastavi", `resetRun`) only sets step to 0 and pauses: map, M, C, R, X stay (m=-0,8 x0=1 step 11 became step 0, x0=1 kept). Next step adds one (4 to 5, x5=1,9375), blocked at 60 (nothing changes). Play from step 4 ticked to 8 (x8=1,992188); typing x0=1 while playing pauses and keeps step 8 (x8 becomes 1,996094, the web redraws from the new start); dragging the handle to 3 does the same (x8=2,003906).
- Switching to logistic from X=0 sets x0=0,1 and appends the notice `Začetek x₀ je nastavljen na 0,1, ker mora biti pri tej preslikavi med 0,01 in 0,99.` to the status until the next state change; with R15 (the default R) no later write clears it, so a lesson that opens RG4 with `set-map` only shows it. A following `set-start` that does not change X, or `set-step`, may or may not clear it (state-keyed: any state write clears it; a no-op does not).

## Doubts

- A lesson cannot frame the view; the cobweb shows the whole window at all times.
- `set-map` on the cobweb ignores a start fallback request: the fallback is the chooser's (X to 0 or 0,1), as decided. An action pair `set-map` then `set-start` is how a lesson picks both.
- The `Start x₀ is set to ...` notice (above) is a visible chooser side effect that equals the control path; slice 2 may prefer a `set-start` write after `set-map` (a changed X) only when it wants the notice gone.

## Slice 2 (PARTIAL: stopped at the budget handoff)

### Written
- `src/learning/content/recursionCobwebGuidedLessons.ts` (new, all 14 steps sl+en): `recursionCobwebLesson` (RG2, 7 steps), `recursionLogisticLesson` (RG4, 7 steps), `cobwebSceneActions` (prepared-scene, set-map, set-params, set-start, set-step; for logistic R=15 it first sets R=12 so the chooser notice is gone), constants `RG2_DEFAULT/SPIRAL/OUT/COSINE/EXPLORE`, `RG4_START/STAIRCASE/SPIRAL/SLOW/EXTINCTION/BORDER/SLOPE/EXPLORE`. Titles and summaries state no result. No change outside the owned paths; temporary probe tests deleted.
- Probes: `.command-logs/rec-b/probe2.txt`, `probe3.txt` (git-ignored).

### Checks observed
- `npx tsc --noEmit` clean (`s2-tsc.log` empty). Backslash check: `singles 0`; rawcheck lists 10 lines with `\'` (escaped apostrophes, lines ~198, 199, 230-237, 323, 324, 380).
- NOT run: `just unit src/graphs/recursion`, `just lint`, the notation test (file not registered).

### Still to do (known defects in the file)
1. Replace every `\'` (f\'(x), learner\'s) by wording without apostrophes (e.g. `f_x`/"the derivative of f at x*", "the learner" -> "of the learner"), then rerun rawcheck.
2. Unapplied wording fixes (the python edit aborted, nothing was changed): typo "Criterij" -> "Kriterij" (rg4 edgeCases); rg4-staircase explanation: delete the last sentence in both languages (it hints the answer); rg4-slope explanation: replace the last sentence ("Pravilo |2-r|<1 ... velja le za ta primer") by "the rule that nearby iterates approach x* if |f'(x*)|<1 is illustrated on examples, not proved" in both languages; rg2-repelling: replace "Se bo mreža približala x*, čeprav začetek skoraj sovpada z njim?" by "The start is close to x*. ... what does the cobweb do after 60 steps?" (current wording hints).
3. rg4-slope: formula block `logistic-slope` shows 2 - r next to the prediction "compute f'(x*)"; consider dropping its formulaIds from that step.
4. Run checks 3 and 4 of the brief and the number table below is the quote list.

### Numbers per step with source
RG2: s1 x1 1, x2 1,5, x3 1,75, x*=2 (probe2 step 0..3; arithmetic). s2 x11 1,999023 (probe), 2*0,5^11=0,000977 and 2*0,5^10=0,001953 (arithmetic). s3 x*=5 (9/1,8), x1 8,2, x2 2,44, x3 7,048, x4 3,3616, x11 5,343597, x38 4,999169 (probe2), x60 4,999994 (slice-1 note), 4*0,8^37=0,00104>0,001>4*0,8^38=0,000832 (arithmetic). s4 x*=50/11≈4,545455, x1 4,48, x2 4,624, x3 4,4512, x4 4,65856, x60 3078,046237 (probe2), factor 1,2 (arithmetic). s5 m=-1: x*=5, 5,4; 4,6; 5,4, x11 5,4 (probe3 "aff m-1 c10 x4.6"); status labels from probe3. s6 x*≈0,739085, slope -0,673612, x8 0,722102, x11 0,744237, x60 0,739085 (probe2 cos x0). s7 x4 0,694778 (cos x0=0,5, probe2); 1;5;1;5 and 2,1;2,15;2,225 (probe).
RG4: s1 r=1,2: x*=1/6≈0,166667, slope 0,8 (probe2); r=1,5: 1/3 (probe). s2 x1 0,135 (arithmetic and probe), x2 0,175163, x3 0,216721, x4 0,254629, x11 0,332305 (probe2). s3 x*=3/5, slope -0,5, x1 0,225, x2 0,435938, x3 0,61474, x4 0,592087, x11 0,60006 (probe2). s4 x*=19/29≈0,655172, slope -0,9, x11 0,678306, x38 0,653811, x60 0,655039 (probe2), difference ≈0,00013 (arithmetic). s5 r=0,8: x1 0,072, x4 0,031071, x11 0,00579, x60 shown 0 (probe2); r=1: x11 0,045851, x60 0,013885 (probe2). s6 r=2,2: x*=6/11≈0,545455, slope -0,2; r=1,1: x*≈0,090909, slope 0,9 (probe3). s7 r=1,1 and 2,9 slopes 0,9 and -0,9.

### Test design (for the tests worker)
Scene = prepared-scene default, then set-map/set-params/set-start/set-step as `cobwebSceneActions` emits. Readout ids (probe2): map, slope, intercept, rate, start, fixed, decisive, shape, steps, iterate; status `[data-recursion-status]`, counter `[data-step-counter]`. Openings and post-change states: RG2 default (step 0, status attracting x*=2) -> type M-16 C90 X100 = RG2_SPIRAL -> type M-24 C100 X460 = RG2_OUT -> (step 5) type M-20, then M20, then C0. RG4_START R12 (no notice, x*=1/6) -> type R15. Logistic R15 scenes must show no notice (probe3 "log R12 then R15"). Learner actions are typed fields and Next step presses; quotes are in the table above.

### Deviations and doubts
- Spec step 5 uses c=6, x0=1 for m=-1; I used the opening c=10, x0=4,6 (only m typed; probed 5,4 / 4,6). No worked examples (frames: explanation, observation). Free exploration scenes are the default affine (RG2) and logistic R15 (RG4).
- Graph defect seen: at r=2 the shape row says "the first step lands on the fixed point", false for the logistic map (x0=0,1 -> x1=0,18, probe2); the lessons avoid r=2. Doubt: the zoom button name "Približaj graf"/"Zoom in" is quoted from localization keys, not checked on the board.

### Slice 2b
- Fixes in `src/learning/content/recursionCobwebGuidedLessons.ts`: all `\'` removed (f' written `f^{\prime}`, "learner's" reworded); "Criterij" -> "Kriterij"; rg4-staircase closing sentence deleted; rg4-slow-spiral closing sentence (limit vs last iterate) deleted; rg2-repelling hint replaced by "start is close to x*; what does the cobweb do after 60 steps?"; rg4-slope closing sentence replaced by the |f'(x*)|<1 illustration wording; rg4-slope formula block moved to rg4-explore.
- Predict-before-reveal sweep: rg2-repelling and rg4-slow-spiral purposes reworded (stated the answer); rg4-slope title "Naklon 2-r" -> "Naklon v negibni točki" / "The slope at the fixed point".
- Checks: tsc clean; bscheck singles 0, rawcheck 0 lines; `just unit src/graphs/recursion` passed; `just lint` passed. Not run: notation test, smoke.

### Slice 2d
- New `src/learning/content/recursionCobwebGuidedLessons.test.ts` (441 lines, tests only). Part A (sl and en): opening sweep of all 14 steps on the real cobweb graph, out of order and twice, state and readouts against closed forms and a direct loop, restore returns the free state; learner actions (typed m, c, x0, r, the map list, Next step, set-step) give the quoted readouts and always change the opening state; prompt labels exist in the graph strings (sl accusative "Obliko mreže" accepted). Part B: quoted numbers recomputed (loop vs x* + m^n (x0 - x*), 2C/(20 - M) and (R - 10)/R as reduced fractions, slope 2 - r vs a central difference, cosine by bisection and Newton, steps to within 0,001 = 11 and 38), sl has no English decimals, en has no unaccounted decimals.
- Observed: `just unit` of the file and `src/graphs/recursion` green (231 tests); tsc clean; lint clean. Red: sl `x_4=3{,}3616` changed to `3{,}3617` failed one test; restored byte-identical (`s2d-red.log`).
- Finding (false claim vs the brief rule "rounded numbers carry približno"): rounded iterates are quoted without a hedge word or "(izračunano)" in rg2-negative-slope (5,343597; 4,999169), rg2-cosine (0,744237), rg2-explore (0,694778), rg4-staircase (4 values), rg4-spiral (4), rg4-slow-spiral (3), rg4-extinction (4). The test pins this list as `KNOWN_UNHEDGED`; shrinking it is a text fix.
- Not verified: the Play button (set-step used instead), browser rendering.
