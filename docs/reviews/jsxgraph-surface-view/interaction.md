# JSXGraph surface view: interaction (task 04)

Covers the JSX view only (`VITE_SURFACE_VIEW=jsx-board2d`); the Three view stays the default until task 07. Code:
`src/graphs/patches/surface-view/jsxInteraction.ts`; tests: `jsxInteraction.test.ts`, `jsxSurfaceView.interaction.test.ts`,
the "JSX surface view" blocks in `TensorPatchEditing.test.tsx` and `TriangularPatchEditing.test.tsx`.

## What a drag moves

- Plain drag (mouse or touch): JSXGraph moves the point in the plane through it parallel to the xy plane, so x and y change and z
  does not (`point3d.update`: `project2DTo3DPlane` with the point's z). Browser z drift was at most 4e-15.
- Vertical drag: JSXGraph moves the point on the vertical line through it, so only z changes. It is on while Shift is held (JSXGraph's
  own `verticalDrag` key) or while the scene's `interaction.zMode` is on (the "Move points in height (z)" switch in the Uredi panel
  of both patch routes). `JsxInteraction.bindView` makes `view3d.isVerticalDrag()` true for either.
- The point cannot leave the view's drag cube: half side `max(2, 1.25 * farthest scene extent from the camera target)`
  (`bboxHalfSide`). A drag past a face stops at the face; state and view still agree (unit-tested). The Three view had no such limit.
- A press selects the point (`select`), then `start`, `move` per board update, `end` on release; the board is not rebuilt, so the drag
  that began on the first press continues. The camera is never edited during a point drag.

## Touch

- No Shift key, so the switch is the only way to change z. The switch help text ("... Off, a drag moves the point horizontally;
  holding Shift while dragging changes only its height") still describes the behaviour, so no localization change was made.
- JSXGraph's touch hit tolerance (30 px) is larger than the spacing of a dense net on a 390 px screen (neighbours 15 to 17 px
  apart), so a finger can grab a neighbour of the point it looks at. JSXGraph fires `down` on every point in tolerance but drags
  one. Defect found and fixed: the first `down` started the drag (and selection) of the wrong point, and the moved point was never
  committed. `JsxInteraction` now follows the point JSXGraph chose (`board.touches[].obj`) in a microtask after the press.
  The point grabbed can still be a neighbour of the one under the finger; that is JSXGraph's tolerance, not changed here.
- Pinch zoom was missing from this task: the JSX view had no two-pointer handling. Task 07C restored it (`31a9d06`, [record](switch-over.md#pinch-regression-fixed)).

## Keyboard (host focused)

Arrow keys orbit 0.1 rad per press (5.7 degrees of azimuth); `+`/`=` zoom in, `-`/`_` zoom out (x0.9). Modified keys are ignored.
Fit is the "Reset view" button; there is no fit key.

## Numeric editor and index selection

Unchanged: the index selects and the x/y/z editor writes the net; the view follows on its next frame. After a drag the editor shows the dragged coordinates, and a drag after a typed value starts from the typed point (unit-tested on both routes).

## Browser evidence (production build, port 4304, headless Chromium; log `04b-browser.log` in the job tmp)

Tensor (default Preset) and triangular. Pointer moved 60 px right and 48 px up (z drags: 72 px up). "Others" = largest screen shift of
the non-dragged control points (0 = camera unchanged); azimuth/elevation unchanged in every row.

| Input | Tensor x, y, z before to after | Triangular x, y, z before to after | Others |
|---|---|---|---|
| Mouse | 0.5, -0.5, 2.5 to 3.36, -0.04, 2.5 | 0, -0.43, 2 to 2.44, -0.05, 2 | 0 |
| Mouse + Shift | 0.5, -0.5, 2.5 to 0.5, -0.5, 3.53 | 0, -0.43, 2 to 0, -0.43, 2.91 | 0 |
| Mouse + switch | 0.5, -0.5, 2.5 to 0.5, -0.5, 3.98 | 0, -0.43, 2 to 0, -0.43, 3.33 | 0 |
| Touch (390x844) | 0.5, 0.5, 2.5 to 7.42, 1.93, 2.5 | 0.5, 0.43, 1 to 6.21, 1.28, 1 | 0 (tensor), neighbour shift only (triangular) |
| Touch + switch | 0.5, 0.5, 2.5 to 0.5, 0.5, 5.43 | 0.5, 0.43, 1 to 0.5, 0.43, 3.82 | same |

In every row the selected point is the one that moved and the editor readout equals the new coordinates. Touch used CDP
`Input.dispatchTouchEvent`. Keyboard on both routes: two ArrowLeft changed azimuth -52 to -63, ArrowUp, `+` and `-` changed the
projection, Reset view restored azimuth -52; no page errors. Narrow default framing: `jsxSurfaceFraming.test.tsx` now asserts every
control point of the default and fitted tensor and triangular scenes lies inside 390x844 (it fails when the bound is shrunk).

## Not verified

Real device touch (iOS/Android), multi-touch and pinch, stylus, Firefox/Safari, Shift on a touch keyboard, screen readers, and
dragging past the cube in the browser (unit-tested only). Other patch routes (de Casteljau, derivatives, subdivision, joins)
share the view but were not driven in the browser. The touch drag picks the point by JSXGraph's tolerance (see above).
