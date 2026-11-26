# L46 (arc-length, area-between-curves, continuity): session 2, finished

Session 1 (07:54, budget stop) did parity recordings, fragments, arc-length and area-between conversions. Session 2 (about 07:55-07:15 wall clock of the continuation, roughly 20 minutes) finished the rest.

## Done
- ContinuityGraph converted: `ContinuityIds`, `drawn` (curve = left piece, value, right), parameter `a` as board range puck (bare name "Parameter", symbol a, help kept), `PuckOwnedGroup`/`PuckOwned` around the slider, `functionPanel()` rows a/value/left-limit/right-limit/jump/status/left-slope/right-slope, note `corner` only while continuous, legend curve/value(point)/right(ring), `renderDeclaredReadout`.
- A new readout row `a` was added to continuity: the old panel showed `a` only as the slider's `<output>`, which the puck now owns, and parity counts that output as missing unless a row with the parameter's symbol carries it. Parity: accepted `extra row a` (`continuityAccepted` in parity.test.tsx). GOLDEN differs deliberately: `row a` is new and the slider output `["1"]` is gone; not re-recorded. `just graph-check continuity` therefore shows golden FAIL; the handler decides.
- Declaration tests for the three graphs (`*.declaration.test.tsx`). Red check: `drawnObject` returned `visible: false` for f / polyline / right. Failures: arc `polyline: expected { color: '#bf8542', visible: false } to match object { visible: true }`; area `expected { color: '#6175ad', visible: false } to match object { visible: true }`; continuity failed in the same test (message not copied). Restored afterwards.
- Frames added in functionGuidedLessons.ts for the three lessons (15 step frame groups); `uses` only where the text asks for a control.
- Old graph tests adapted (notes/legend now read from the declaration; continuity rows gain `a`); FunctionsFirstTask `area-between` and `arc-length` now puck cases (plan entries removed). Continuity is not in that file.

## Checks observed
- graph-check area-between-curves and arc-length: PASS (contract, parity, golden, declaration, shared 90). continuity: contract, declaration, shared pass; golden FAIL (deliberate, above); parity passes with the accepted difference (run via BEZEG_PARITY_CHECK).
- `just unit` of the brief's paths: all pass except the Taylor parity test of the other worker (first run), the continuity rows test fixed after; I re-ran changed test files individually and they pass. `just typecheck` clean, `just lint` clean on the changed files. The final full multi-path unit run was not repeated after the last two test edits (only those files).

## Placement judgements
- arc-length: n, a, b board pucks, nothing in Orodja. area-between: a, b and a 3-option mode puck, nothing in Orodja. continuity: `a` puck. Legend place unchanged (bottom right, no hook), not checked in a browser.

## Smoke locators (tests/guided-lessons.smoke.spec.cjs; not run)
- 716-736 continuity, 825-845 area-between, 861-880 arc-length use `[data-readout="<id>"] dd` (lines 707, 811, 848) with ids that still exist; no old control labels are used anywhere in tests/*.cjs. Risk: if the inspector readout is hidden while board cards show it, these locators resolve to the card copy or fail strict mode; also `boardStats(...).points` thresholds at 719, 828, 864 assume the same point counts (unchanged board).
