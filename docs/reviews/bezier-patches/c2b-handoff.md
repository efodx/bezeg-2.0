# Slice C2b handoff (partial, HANDOFF received)

## Done (implemented, uncommitted)
- `surface-view/surfaceScene.ts`: `SurfaceView.onLayout(listener)`. `threeSurfaceView.ts`: `computeLabels`, `publishLayout` (after each `renderNow`, only when the rounded layout changes, cleared on dispose; a new subscriber triggers a render).
- `SurfaceLabelOverlay.ts` (new): DOM overlay in the view host (aria-hidden, pointer-events none, inline styles), places/hides labels from `LabelLayout`, typesets `\(text\)` via injected typesetter (default `typesetMath`), `showStill(capture, work)` (img over the canvas for html2canvas), `dispose`.
- `BaseSurfaceGraph.tsx`: owns overlay + `view.onLayout` subscription (session cleanup), overrides `figureContainer()` and `createFigureCaptureTarget()` (target carries `still`, placeholder `rendererRoot`), `typeset` option; its `workspaceSave` override is deleted so BaseGraph's panel (SVG/PNG + `batchExporter`) applies.
- `BaseGraph.tsx`: `figureContainer()` and protected `createFigureCaptureTarget()` replace the `hasBoard` guards and `getFigureCaptureTarget` in `saveAsSVG`, `saveAsPNG2`, `exportPresetFigures`. Curve behaviour unchanged.
- `export/FigureCapture.ts`: `StillFigureSource`, optional `FigureCaptureTarget.still`; PNG runs inside `still.present`; SVG uses `StillFigureSvg.ts` (new `buildStillFigureSvg`: one `<image>` plus vector labels for visible labels only, size from the MathJax viewBox at the font size).
- `patchSceneBuilder.ts`: label `selected-point` (`P_{ij}`, `pointId`) when the net is shown and a point is selected. `FakeSurfaceView.ts`: `onLayout`, `emitLayout`, `captureResult`, `captures`.
- `graphTransientStateContract.tsx`: `NO_FIGURE_BATCH` and `expectNoFigureBatch` removed; the real batch contract tests pass for `patch-tensor`.
- New tests: `StillFigureSvg.test.ts`, `SurfaceLabelOverlay.test.ts`, `TensorPatchExport.test.tsx`; added cases in `FigureCapture.test.ts`, `patchSceneBuilder.test.ts`, `threeSurfaceView.test.ts`.

## Checks observed
- `npx vitest run src/graphs/patches src/graphs/base` (`.command-logs/c2b-vitest2.log`): 830 passed, 1 failed.
- `npx tsc --noEmit --pretty false`: clean (last run).
- Not run: eslint on changed files, `just build`, localization (no new keys added), browser/smoke.

## Remaining
1. The one failure: `TensorPatchExport.test.tsx` "Preset figure batch" (`expect(html2canvas calls) >= 1` got 0 although one download happened). Investigate: probably the batch blob download came from something other than a figure capture, or the test's mock/`settle` timing; check `.command-logs/c2b-vitest2.log` line ~689. The product batch path is also covered by the contract tests, which pass.
2. Mutations (one observed failure per assertion group) are not done. Suggested: drop `if (!label.visible) continue` in `StillFigureSvg.ts`; drop `publishLayout` change-key check; skip `image.remove()` in `showStill`; drop `overlay.dispose()`/`onLayout` cleanup in `BaseSurfaceGraph.createMainView`; drop `showControlNet && selectedIndex` in the builder label.
3. Run eslint on changed files, `just build`; a browser check of real WebGL capture, html2canvas rendering of the swapped `<img>` + CHTML labels, label alignment with the SVG (offset/centering constants in `SurfaceLabelOverlay.ts`), and resize.

## Flags
- `FigureCapture.ts` `FigureCaptureTarget.rendererRoot` stays required (existing test types); the surface target supplies an empty placeholder svg (`BaseSurfaceGraph.tsx`, `createFigureCaptureTarget`).
- The Bash tool halves backslashes in heredocs; I fixed the `\\(` cases in `SurfaceLabelOverlay.ts:66` and its test; recheck any other TeX strings if more files are generated that way.
- Files with CRLF working copies were edited preserving CRLF; `threeSurfaceView.ts`/`surfaceScene.ts` are LF (git warns on conversion).
- SVG surface geometry is raster by design (ADR 0018); labels are vector. PNG labels come from the on-screen CHTML via html2canvas.

## Finish (second worker)

### Failure diagnosed
`TensorPatchExport.test.tsx` "Preset figure batch": the test was wrong, the implementation was right. `ImageGenerationModal` (`PresetSelector.tsx:26`) initialises its selected Presets when the selector mounts; the test saved Preset `mine` after mount, so nothing was selected, the batch captured zero figures, and an empty `slike.zip` still downloaded (hence one download, 0 html2canvas calls). Fix: the test ticks the `mine` checkbox, then asserts exactly one html2canvas call and that the zip holds `mine.png`. The batch already goes through `capturePNGBlob` (`PresetFigureBatch.ts:112`), the same seam as single PNG export; the contract mocks of `capturePNGBlob` stay valid for every graph.

### Added assertion
Mutation M4c survived the first round (`waitForOwned` around `still.present`), so `FigureCapture.test.ts` gained "disposing the graph while the still presentation is still settling cancels the capture without waiting for it".

### Mutations (apply, run focused tests, restore; all files restored)
| Group | Mutation | Observed |
|---|---|---|
| StillFigureSvg visible filter | `if (!label.visible) continue;` -> `if (false) continue;` | 3 failed (StillFigureSvg x2, TensorPatchExport SVG) |
| StillFigureSvg `<image>` href | href set to `dataUrl + "x"` | 2 failed |
| Overlay position | `style.left` fixed to `0px` | 3 failed |
| Overlay visibility | `hidden = false` | 4 failed |
| Overlay removed on dispose | `this.element.remove()` dropped | 2 failed (overlay test, graph unmount test) |
| onLayout unsubscribed on unmount | `registerCleanup(view.onLayout(..))` -> bare subscription | 1 failed |
| PNG through shared still lifecycle | `still.present(encode)` -> `encode()` | 5 failed |
| Still image restored | `image.remove()` dropped | 4 failed |
| PNG cancelled while settling | drop `waitForOwned` around `still.present` | survived, then new test: 1 failed |
| onLayout publishes only on change | key check removed (`threeSurfaceView.ts` publishLayout) | 1 failed |
| Selected-point label gating | `showControlNet &&` dropped from builder | 1 failed |
| Batch contract patch-tensor | `figureContainer()` returns undefined | 2 failed (both batch contract tests, part2) |

### Checks observed
- `npx vitest run src/graphs/patches src/graphs/base`: 42 files, 832 passed (`.command-logs/c2b-final-vitest.log`).
- `npx vitest run src/graphs`: 106 files, 2179 passed (`.command-logs/c2b-final-graphs.log`). Run before the last test-only typing fix; `FigureCapture.test.ts` re-run alone: 11 passed.
- `npx tsc --noEmit --pretty false`: clean (after fixing one TS2322 in the new test).
- `npx eslint` on the 16 changed/new ts/tsx files: clean. `just build`: passed (warnings present, see its log).
- Line endings: index and working copy are LF for `threeSurfaceView.ts` and `FakeSurfaceView.ts` (`git ls-files --eol`); the git CRLF warnings come from `core.autocrlf=true`.
- Not verified: real WebGL capture, html2canvas rendering of the swapped `<img>` with CHTML labels, label alignment against the exported SVG, resize, any browser/smoke run.
