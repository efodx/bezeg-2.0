# IA-A-2b: typed point list and I1 basis plot (worker evidence)

Slice F2a, no route. Not committed. Browser not checked.

## Files
- New `src/inputs/PointListInput.tsx/.css/.test.tsx`: generic typed list (index label, x and y `NumberInput`, `applyOn="confirm"`).
  Props: points, `onCommit(index, [x, y]) => string | void` (a returned string refuses the edit and is shown at that field via
  `rejectedHint`, aria-invalid, live status), title, `pointLabel`, optional axis labels, min/max. No graph logic.
- `InterpolationGraph.tsx`: `editPoint` (same `interpolationRejection` path as a drag, plus the notice), `setShowBasis`, list and
  basis toggle in `getGraphCommands`. Preset field `showBasis` (model, collection, export, import, lesson default state).
- New `interpolationBasis.ts` (data), `BasisPlot.tsx/.css` (inline SVG), tests `BasisPlot.test.tsx`.
- `sl.ts`/`en.ts`: `interp_point_list`, `interp_point_name`, `interp_show_basis`, `interp_basis_lagrange`, `interp_basis_bernstein`, `interp_basis_help`.

## Decisions
- Rendering: inline SVG React component, no second JSXGraph board (nothing to own or dispose). Colour per index is
  `hsl(360 i/(n+1) 70% 45%)` in both plots; axes, panel and text use `--workspace-*` tokens. Bernstein values come from
  `bezierCurvePoint(...).weights`, Lagrange from `lagrangeBasis` with cached `barycentricWeights`; 161 samples per curve.
- Old Presets without `showBasis` import as false (`check` defaults it); a non-boolean is rejected.
- Typed edits do not refit the view (a point typed far away may be off screen until Fit).
- Bernstein wording "Bernsteinovi bazni polinomi" follows existing "Bernsteinovi Polinomi".

## Checks (observed)
- `just unit src/inputs src/graphs/curves/interpolation src/localization`: passed. `npx tsc --noEmit`: clean. `npm run build`: exit 0.
- Mutations (each run on the focused tests, then reverted; all failed as intended): editPoint no-op (2 tests), no rejection
  (1), Bernstein x -> 1-x (1), Lagrange marker at s instead of s t_n (1), old-Preset default true (1), list fed stale points (2),
  x/y swapped in PointListInput (3), refusal ignored (1), plot paths removed (1).

## Not verified
Browser, SL/EN visual and live language switch, projection readability, dark mode colours, touch/keyboard in a real browser.

## Repair round
- R1 tick labels use `formatNumber(value, currentLanguage())`; `useT` re-renders on a switch. Test: sl "0,5", en "0.5", back.
- R2 numbered legend (swatch + index, `n+1` items) under both plots; SVG `<title>`/`<desc>` (curve count, s, marker values; `interp_basis_desc`, `interp_basis_index` in sl/en).
- R3 `BasisPlot` takes `fontSize` (graph passes `displaySettings.fontSize`); tick text = 0.65 x size (min 10), pads scale with it; y axis labels 0, 1 and the reached extremes outside [0, 1].
- R4 `PointListInput` ties a refusal to the `points` array it was refused for and clears it (and the field's own hint, by re-keying) when the list changes.
- R5 `editPoint` no longer sets the graph notice; the field alone shows the actual rejection text (one announcement, no `role=alert`).
- R6 an accepted typed edit outside `getBoundingBox()` calls `fit()`; inside leaves the view.
- `await act(async () => graph.reset())` still times out (30 s) under jsdom, so the test keeps `waitFor`.
- Mutations (each caught): comma hard-coded (3 tests), desc removed (1), fixed font (1), extreme tick removed (1), refusal not cleared (1), notice set on typed refusal (2), no refit (1). Removing only the render-time list guard in R4 is not caught (the effect also clears it).
- Checks: unit (inputs, interpolation, localization) passed, tsc clean, build exit 0. Still no browser check.

## Handler acceptance (handler 5, 2026-10-31)

Engineering + UI review (`bezeg-reviewer` Sonnet): R1-R6 fixed in one repair round (locale-aware ticks with live switch, index legend and SVG title/desc, font size from display settings and labelled y extremes, refusal cleared on external change, single announcement at the field for typed edits, refit when a typed point leaves the view). Deferred: memoizing basis samples, to be decided by the drag measurement at registration. The handler checked the basis mathematics (`interpolationBasis.ts`: Lagrange on \([0,t_n]\) with \(t_0=0\), Bernstein from the curve's own weights, markers at \(s\,t_n\) and \(s\)); no separate mathematical review, since the kernels were reviewed in IA-1a.
Handler checks: `just unit src/inputs src/graphs/curves/interpolation` pass; `npx tsc --noEmit` clean; `npm run build` exit 0. Not verified: browser layout at narrow and projection sizes, dark mode, SL/EN live switch in a browser, touch.
