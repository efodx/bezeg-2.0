# lm-c F3 slice 1: composition-mode lesson actions and L5 opening probe

## Written
- `src/learning/model.ts:304-312` (+ import of `MapElement`): `choose-element {slot, element?: MapElement | null}`, `set-translation {translation: [x,y] | null}`, `set-pivot {pivot: [x,y] | null}`.
- `src/linear/linearMapModel.ts`: new `enterMode(state, mode)` (adds R k=6 and F k=0 when entering composition with no composition fields); `applySetMode` uses it; `SetVectorPayload.value` optional; `validateSetVector` accepts `null` (field dropped), still strict otherwise; `applySetVector` drops the field for `undefined`. `validateChooseElement` already cleared on null.
- `src/graphs/linear/LinearMapGraph.tsx`: `setMode` calls `enterMode`; `applyLinearMapAction` has the three new cases; unused imports removed.
- Kernel tests added to `src/linear/linearMapModel.test.ts` (null drop, k = 1.5, off-grid, `enterMode`).
- New `src/graphs/linear/LinearMapCompositionLessonActions.host.test.tsx` (6 tests): action equals control (source chooser + angle slider via change event, B entries, translation and pivot inputs), synchronous sequence, `set-mode composition` equals the UI switch and keeps stored fields, null clears, checkpoint restore, invalid actions (k 24, 1.5, unknown kind, slot 'third', [4.25,0], [0.1,0], missing, pivot off range) change nothing and name the field.
- No existing lesson uses `set-mode` for `linear-map` composition (searched `src/learning/content`).

## Observed
- Host red (3 case lines commented, `applySetMode` back to `changeMode`): 5 of 6 fail (`f3-host-red.log`); restored; green `f3-host.log`.
- `just unit src/graphs/linear src/linear src/learning` passed (`f3-unit.log`), tsc clean (empty log), lint passed, LF checked.
- Angle slider: plain arrows are native range keys (no-op in jsdom); the test sets angles with `fireEvent.change`. Shift+Arrow and PageUp/PageDown move by 6.

## Probe summary (full: `.command-logs/lm-c/probe-l5.txt`, sl + en)
- Product rows are labelled BA ("BA: vrstica 1/2"), plus "Determinanta (BA)", "Orientacija (BA)" (obrnjena/...), and "BA je: ..." (the kind: reflection with line angle, or rotation by an angle), only when the product is a rotation or reflection (absent for free shear).
- 1 R then F: BA = [[0,-1],[-1,0]], reflection in line 135 degrees (k=18). Swapped F then R: [[0,1],[1,0]], line 45 degrees (k=6). R then R: -I, rotation 180 degrees. So the "BA je" row and the matrix change at once on a swap.
- k=2 rotation then k=3 reflection: "približno" matrix, reflection 7,5 degrees (k=1); swapped: 37,5 degrees (k=5). Reflection k=3 then k=1: rotation 330 degrees (k=22); swapped 30 degrees (k=2) (twice the angle difference).
- 6 R then free shear B=[[1,1],[0,1]]: BA = [[1,-1],[1,0]], det 1, no "BA je" row.
- Translation without a pivot: only the four "Slika T(P_i)" rows change; no row for b (the arrow is on the board). The row "Vektor t v T(P) = BA·P + t" appears only when a pivot is stored. Pivot (3,1) (default R then F): t = (4,4), images (4,3),(1,2),(2,0),(5,-1); pivot+translation: t = (6,5).
- Status list is empty in all these states (only collapse and view-scale statuses exist).
- Board: labels P_0..P_3 and T(P_0)..T(P_3), pivot handle "c" only with a pivot, translation arrow only when b is not 0; no other readouts (no B(1/2)).
- Reset (composition): back to R, F, no secondEntries, translation or pivot; the matrix of slot A is kept.

## Doubts
- The status area stays empty for composition, so the "kind" is only in the "BA je" readout.
- The probe selector for statuses (`[data-linear-map-status]`) may not match the rendered attribute; the empty STATUS lines are consistent with the code (`compositionStatuses`) but were not checked against a collapse case.
- No smoke or browser check was done.
