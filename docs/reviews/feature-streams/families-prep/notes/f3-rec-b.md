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
