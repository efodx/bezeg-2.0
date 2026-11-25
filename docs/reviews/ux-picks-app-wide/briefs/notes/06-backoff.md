# Task 06 slice 4 (worker note): back-off for over-budget captures

## Design
- Budget: `PREVIEW_BUDGET_MS = 8` (about half a 60 Hz frame) of one geometry call, measured by the controller with `performance.now()` around each capture (total / number of values), kept per parameter key. The first hover of a key is always captured at once (cost unknown); a key measured over budget is backed off from then on and re-measured at every capture.
- Under budget: unchanged (computed in the frame loop tick).
- Over budget, single value: the pointer must rest `BACKOFF_REST_MS = 150` ms on the same value (a new value restarts the wait), then the capture runs in `requestIdleCallback` (timeout 400 ms), fallback `setTimeout(50)` where missing.
- Value text: the puck sets its tooltip (`Klik: v`) on pointer move, independent of the controller, so it shows at once; the ghost follows when captured. The stale ghost of an older value is cleared at once when a newer value arrives.
- Latest wins: `start()` cancels the pending wait/idle callback and replaces the target; the capture reads the target at run time. `hide()` (pointer leave, press, lock, frame change, dispose) cancels everything.
- Fan (already after its own 300 ms rest): idle time only, no second rest.
- View box or scene version change while held (over budget): one idle capture, no rest. The snapshot (`exportPreset`) is now taken inside the capture, so an over-budget graph pays for it in idle time.
- Sweep: unchanged; a sweep start ends the hover through `hide()`, which cancels pending captures.
- Isolation: the capture reads only; no write, no lease, no adapter calls (the view director is not involved).

## Files
- src/workspace/preview/previewController.ts (constants, `capture`, `defer`, `cancelPending`, `overBudget`, `start`, `tick`)
- src/workspace/preview/backoff.test.tsx (5 tests)

## Tests
Red (`overBudget` forced false): 4 of 5 failed, the under-budget test passes by design (06-backoff-red.log). Green: 06-backoff-run4.log.
Full: `just unit src/workspace src/graphs/dynamics src/graphs/base src/inputs` passed (06-backoff-full.log, includes controlsSignature, graphTeardownContract, GraphTransientState*); PresetRoundTrip.contract + declarationContract passed (06-backoff-contracts.log). tsc 0 lines; lint passed on src/workspace/preview.

## Browser (06-backoff-browser.cjs/.log), 1440x900, phase portrait phase-a track
Move onto the track to tip text 33 ms and to ghost 33 ms (the same frame; phase-a is under budget so not backed off); 61-move hover sweep: 123 frames, max gap 16.8 ms, no long task, CLS 0. The back-off path is unit-tested only: no graph in the app is over budget yet.

## Open
- Mid-morph, `exportPreset()` (the snapshot) runs the morph's `atTargets` writes under the morph's own lease and restores them; the store version bumps, so a held ghost recaptures after a morph frame. Not a preview write, but untested for loops.
- Budget 8 ms / rest 150 ms are guesses for the owner's feel.
