# 08 lane L40: bezier-clipping

Done, about 8 minutes. Route `bezier/clipping`.

## Changed
- `BezierClippingGraph.tsx`: opts into `declaresPointSetWorkspace`; `BezierClippingIds`; `overlayMessage`, `overlayIsPuck`, `overlaySwatch`, `pointSetNotes` (step, status, clips, widest; empty before the first Preset), `declaration()` (adds legend `curveA`/`curveB`, actions `next-step`/`play`/`reset`), `drawnObject` (curves by board name), `performAction`.
- `BezierClippingControls.tsx`: readout group is `data-declared-panel`.
- Lesson frames: 8 frames declared (`bezierClippingGuidedLessons.ts`, local `frame` got `declare`).
- Parity: SAMPLES entry + `compgeo/__parity__/bezier-clipping.json` (8 states). Fragment `bezier-clipping.ts` (2 keys, curve A/B) + index.
- Test `BezierClippingGraph.declaration.test.tsx` (11).

## Placement
- Pucks: fat line, kept, discarded (the clipping story flips them while stepping). Orodja: control, hull, grid (setup/display), playback (next step, play, reset: not toggles worth a puck except play, which a puck would duplicate with the Orodja buttons), tolerance (8 options, chosen once, no arbiter key), interval table and distance inset (no declared kind).
- Legend default place not changed (bottom right).

## Red
Kernel: `clipFold` count `+ 1` (bezier-clipping.ts, restored) fails 6 of 11 declaration tests: `expected [ 'Korak 1 od 26', 'Število rezov: 1' ] to deeply equal [ 'Korak 1 od 26', 'Število rezov: 0' ]`. Panel and declaration share `bezierClippingReadout`, so the test pins written-out texts from the recording.

## Observed
graph-check PASS (contract, parity, golden, declaration, shared 45; browser skipped); parity golden check passed; unit compgeo + lesson test + declarationContract + localization + base/declare passed; tsc empty; lint passed.

## For the handler
- No point/choice parameter for tolerance or points: undeclared.
- Table and inset stay in Orodja (not declared).
- Not verified: browser, screenshot, pucks on the board.
