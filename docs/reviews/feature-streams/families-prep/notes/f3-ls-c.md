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
