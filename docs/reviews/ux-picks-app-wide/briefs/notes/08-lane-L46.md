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

## Session 2 (definite-integral, derivative): PARTIAL (budget handoff)

### Done (observed)
- Parity recorded before conversion (SAMPLES added in parity.test.tsx, `functions/__parity__/definite-integral.json`, `derivative.json`), then both graphs converted: `DefiniteIntegralIds`/`DerivativeIds`, `drawn` maps, `parameterBindings`, `declaration()`, `drawnObject`, `functionPanel()`, `renderDeclaredReadout`, `PuckOwned(Group)` around the replaced controls, old `renderLegend` removed (integral).
- Fragments `definite-integral.ts`, `derivative.ts` registered in `fragments/index.ts`.
- Declaration tests `DefiniteIntegralGraph.declaration.test.tsx`, `DerivativeGraph.declaration.test.tsx` (pass; red check NOT yet run).
- Frames in functionGuidedLessons.ts (10 steps; `derivativeFrame`/`integralFrame`). Old graph tests adapted (notes/legend from declaration; Edit-order test: legend slot now null). FunctionsFirstTask: `derivative` and `integral` now puck cases (plan entries removed).
- Observed: `just typecheck` clean (before the last unicode-symbol edit); `just unit src/graphs/functions src/learning/content/functionGuidedLessons.test.ts src/learning/content/declarationContract src/localization src/graphs/base/declare` passed (before the unicode-symbol edit and the parity accepted-list removal); `graph-check definite-integral --route /functions/definite-integral` PASS (contract, parity, golden, declaration, shared 90).
- `graph-check derivative`: contract, parity, declaration, shared pass; golden FAIL only by `outputs: golden ["1"] now []` (h slider output taken over by the h puck; row `h` exists with the same value), in 5 states. Deliberate, not re-recorded: handler re-records.

### Placement
- integral: n count puck, a/b range pucks, sum-method 4-option choice puck; function select stays in Orodja (setup). derivative: h and x0 range pucks, tangent switch puck (action `tangent`); function select stays in Orodja. Legend defaults (bottom right) not checked in a browser.
- Rows with Unicode symbols `x₀`, `f(x₀)`, `f(x₀ + h)` (not TeX `x_0`) so that parity/golden keys stay identical; KaTeX typesetting of those symbols NOT verified visually. Puck param symbol is TeX `x_0`.

### Not done
- Red check of the two declaration tests; `just lint <changed files>`; re-run of unit paths and `just typecheck` after the last two edits (unicode symbols; parity.test accepted-list removal); `just build`; `just smoke-lesson definite-integral derivative --port 4391 --workers=1`; smoke locator review (tests/guided-lessons.smoke.spec.cjs derivative ~742-770 and definiteIntegral ~788 read `[data-readout="<id>"] dd`; ids unchanged; boardStats thresholds unchanged board). Note `.command-logs/*.sh|tsx` scratch files and `__parity__/*.report.txt` (derivative, definite-integral) were generated; delete the reports.

## Session 2 (continued)

- Derivative rows now TeX symbols (`x_0`, `f(x_0)`, `f(x_0 + h)`) in DerivativeGraph.tsx functionPanel.
- Red check (broke `drawnObject` visible in integral, tangent `visible` in derivative; mutations reverted): integral "AssertionError: curve: expected { color: '#6175ad', visible: false } to match object { visible: true }" (5 states); derivative "AssertionError: expected true to be false" (4 states) and "tangent: expected { color: '#587445', visible: false } to match object { visible: true }" (tangent state). Breaking a row value alone does not fail (rows compared with the inspector, same source).
- typecheck, lint (changed files), unit paths, build, smoke-lesson derivative + definite-integral: pass. graph-check definite-integral: PASS.
- graph-check derivative: FAIL parity + golden. Parity: symbol-only rows are matched raw (parity.ts:190 applies plainSymbol only with a name), so recorded `x₀`, `f(x₀)`, `f(x₀ + h)` are "missing" and declared `x_0`, `f(x_0)`, `f(x_0 + h)` "extra" in all 5 states. Golden: same label/key typesetting plus `outputs: golden [..] now []` (h slider output moved to row `h`). Not re-recorded, no accepted list added.
- Parity report files removed.
