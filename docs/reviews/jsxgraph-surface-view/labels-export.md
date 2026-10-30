# Task 05: labels and export (JSXGraph surface view)

Spec: [criterion 5](../../specs/jsxgraph-surface-view.md#acceptance-criteria). Task: [05](../../tasks/jsxgraph-surface-view/05-labels-export.md).

## What was built

- `jsxLabels.ts` (pure): `computeLabelLayout` projects each label anchor with `projectToScreen` (the one projection) and
  sets `visible` when the anchor is in the viewport in front of the eye and no mesh triangle crosses the eye-anchor
  segment (`isAnchorOccluded`: two-sided Moller-Trumbore, a hit must lie more than `1e-3` plus the mesh's
  `chordTolerance` in front of the anchor; the tolerance applies only to labels without a `pointId`, as in the Three
  view). `labelLayoutKey` rounds to 0.1 px so an unchanged layout is not re-delivered.
- `JsxSurfaceView.onLayout` delivers after each drawn frame when the key differs from the last delivered one; a new
  subscriber resets the key and receives the current layout on the next frame (same as Three). Occlusion is computed
  on every frame, including reduced-detail orbit frames, so it never lags; the spec allowed one settled frame of lag
  and the cost (labels x triangles) was not a problem, so no lag was introduced.
- `jsxCapture.ts` + `JsxSurfaceView.capture()`: ends any reduced-detail orbit, redraws at full detail, serialises a copy of the
  board `<svg>` (empty `foreignObject` removed) into a `data:image/svg+xml` image, draws it on a white canvas at
  `min(devicePixelRatio, 2)` and returns `toDataURL('image/png')` with the label layout of that frame. No external image,
  font or style sheet is referenced, so the canvas is never tainted. The constructor takes optional `RasterServices`
  (image loader, canvas factory) so jsdom, which decodes no images, can test the data path.
- Labels are not drawn on the board: `SurfaceLabelOverlay` (unchanged) places the MathJax-typeset formulas from the layout.

## Decision: figure SVG keeps embedding the raster

The figure SVG export still embeds the captured PNG as an `<image>` plus vector MathJax labels
(`StillFigureSvg`), exactly as it does for the Three view. Reason: bounded scope and parity with the existing
`showStill`/export tests, which assert one `<image>` and typeset visible labels; the JSX board is already SVG, so vector
surface geometry in the figure is feasible later (clone the board SVG into the figure instead of rasterising it) but it
changes `StillFigureSource`, `StillFigureSvg` and their tests and was not required by the criterion. Deferred as a possible
improvement; no change to `SurfaceLabelOverlay.showStill` or the export tests was needed.

## Evidence

Unit (jsdom), all new files pass; mutations fail them (`05-mutation.log`):

| Mutation of `jsxLabels.ts` | Result |
| --- | --- |
| occlusion disabled (`isAnchorOccluded` returns false) | 6 tests fail (4 in `jsxLabels.test.ts`, 2 in `jsxSurfaceView.labels.test.ts`) |
| anchor x shifted by 1 px | oracle projection test and view first-frame test fail |
| chord tolerance ignored | tolerance test fails |

- `jsxLabels.test.ts`: every anchor equals the independent pinhole oracle (12 random cameras, each with one of 6 viewports, x 6 probes),
  occlusion in front/behind, tolerance, back faces, shared triangle edge, hidden or missing mesh, outside viewport, behind the eye.
- `jsxSurfaceView.labels.test.ts`: layout delivery only on change, resubscribe, unsubscribe, dispose; capture result,
  current geometry, standalone SVG without `foreignObject`, `image`, `use`, `style`, `script` or external references,
  rejection before attach, after dispose and without a canvas context. The capture test found a duplicate `xmlns`
  attribute and the empty `foreignObject` in the first draft, both fixed.
- `TensorPatchJsxExport.test.tsx`: the real `TensorPatchGraph` with the real JSX view: SVG export has one `<image>`
  with the capture and one typeset label per visible overlay label; PNG export shows the render and the visible labels
  while `html2canvas` reads the container, then restores the live view.
- Browser (production build `VITE_SURFACE_VIEW=jsx-board2d`, Chromium via Playwright, preview on port 4305, stopped
  afterwards): on `/patches/tensor` (default and Side view) and `/patches/triangular`, `PNG` and `SVG` downloads succeed,
  the console has no errors or warnings (no taint `SecurityError`), the PNG shows the current surface, net, points and the
  typeset `S(u,v)` / `S(u,v,w)`, and the SVG (rendered in a browser) shows the same image with the vector label. Files:
  `tmp/05-export/{a-tensor,b-triangular,c-tensor}.{png,svg}` under the job directory.

## Not verified / risks

- The Three view also lets other control point spheres occlude a label; the JSX view tests the scene mesh only (as briefed).
- No browser case of a label hidden by occlusion in an exported figure (covered by unit tests only); no Firefox or Safari
  run (Safari has historically tainted canvases drawn from SVG images that contain `foreignObject`, which is removed here).
- `capture()` calls `flush()` itself; a capture during an active drag draws the pointer-current frame.
