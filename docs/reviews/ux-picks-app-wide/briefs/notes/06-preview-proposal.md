# Task 06 slices 1-2: preview mechanism and ghost (proposal)

## 1. Contract
- Function type, in a new `src/graphs/base/preview/previewGeometry.ts` (types only, no React or JSXGraph):
  `PreviewGeometry<K> = (scene: {state, preset: Preset}, key: K, value: number, view: PreviewView) => PreviewCurves`, with `PreviewCurves = Record<string, Path[]>` (board coordinates, one polyline per gap; `Path` from `experiment/paths.ts:7`). `view` is `sampledRange(shownBox)` (`experiment/subjects.ts:38`, box widened 10% per side) so edges match the live curve.
- Input is the Preset snapshot (`exportPreset()`), not `state`: De Casteljau's control points live on the board (`subjects.ts:94`). The snapshot is read once on hover start, then the function is pure.
- Registration: next to `declaration()` (`BaseGraph.tsx:265`) a protected `previewGeometry(): PreviewGeometry | undefined` plus public getter, as `getDeclaration` (`:269`). Graph-specific math stays in its own module (pure), the method only binds it.
- Declaration marks: `readonly previewable?: true` on `RangeParameter` and `CountParameter` (`graphDeclaration.ts:50,63`; not choice or toggle). `checkDeclaration` rejects `previewable` when the graph has no geometry function, so a mark never promises a missing preview.

## 2. Ghost without touching live state
A `GhostOverlay` (new, `src/workspace/preview/`) is one absolutely positioned `<svg>` in the board frame, `pointer-events:none`, `aria-hidden`. World to pixel uses the adapter's shown box (`viewAdapter.ts:90,264`, `getBoundingBox`) and the container size: `px=(x-left)/(right-left)*w`, `py=(top-y)/(top-bottom)*h`. It never reads `board.objectsList`. Ownership: created by the workspace presenter when a hover starts, one per board, removed on hover end, on frame change, on board dispose and on the view changing (the ghost is redrawn from the new box, or cleared). It holds only copied arrays, so a preview cannot reach `exportPreset()` or the arbiter: it makes no write, takes no lease. Keep the paths as `<path d>` with a 1.5 px dashed stroke, one frame per hover value (value change replaces, rAF-coalesced).

## 3. Worked example: phase portrait
`derivePhase(serializePhaseState({...state, A: value}))` (`dynamics/phaseModel.ts:262`) gives `orbits[].forward`, already pure and board-free; the harness geometry is `subjects.ts:124-135`, 0.1 ms at 1x. Parameter A is a range puck. Second example, Bezier `t`: `bezierPoint` (`affineTrack.ts:53`), but it needs the snapshot's control points. Both convert to a pure module with the graph method binding it.

## 4. Tests
- Equality: port the harness test (`experiment/previewOptions.test.ts:50-100`) with the live board in place of the shadow: set the live graph to value v (learner write), read drawn paths with `curvePaths` (`paths.ts:22`), compare with `geometry(snapshotBefore, v, view)` through `pathDeviation` (`paths.ts:57`). Keep the perturbed-state negative test (`:96`). One case per previewable parameter on the pilot.
- Export: take `exportPreset()`, run hovers during a sweep, a drag and playback, assert deep-equal export and unchanged arbiter value (spec acceptance 3).
- Frame sampling (browser, `just` smoke): on each `requestAnimationFrame` during hover, read the live board curve `d`; assert it equals its resting value in every frame, and that the ghost `d` equals the geometry at the hovered value.

## 5. Experiment code removed
Delete `src/graphs/base/preview/experiment/` whole (`shadowBoard.ts`, `subjects.ts`, `paths.ts`, `previewOptions.test.ts`) and the `just preview-measure` recipe. Before deleting, move `Path`, `curvePaths`, `pathDeviation`, `splitPaths` to `src/graphs/base/preview/paths.ts`, and `sampledRange` to `previewGeometry.ts`, since the real test needs them. The ADR's measurement stays as history. Reference `src/uxPicks/a19/ghost.ts` is the rejected live-probe style (`probeWindow`, `captureGhost`); take only the UX (idle back-off, `EXPENSIVE_MS`) in slice 4.

## 6. Hover entry points
- Puck track: `.puck-track` at `RangePuck.tsx:218` (ref `trackRef:57`); value under the pointer from the same maths as the click-jump (`:163-165`). Body handlers `tip.handlers` (`:211`, `useTip` `PuckParts.tsx:30`) already limit to mouse; the ghost needs its own `onPointerMove` on the track, mouse only; keyboard focus shows no ghost (a later decision).
- Tools slider: `<Slider>` at `SectionBody.tsx:29`; Slider (`src/inputs/Slider.tsx:61`) gains optional `onHoverValue(v|null)`.
- Count - / +: `CountPuck.tsx:102,119` buttons (previews `value∓1`); tools `<CountSetter>` at `SectionBody.tsx:35` (`inputs/CountSetter.tsx:48`) gets the same `onHoverValue`.
- Tooltip: today puck tip shows `help` (`RangePuck.tsx:196`). Add catalog keys `puck_preview_value` ("Klik: {value0}", en "Click: {value0}") in `sl.ts`/`en.ts` (lockstep), value formatted by the puck's `fmt`. Slider and count show it in their value label.

## 7. Risks and open questions
- Pointer-move ghost recomputes per frame: fine for phase portrait (0.1 ms) but a graph with costly math needs slice 4 back-off; ADR 0067 shows A is under budget only for the three pilots.
- View changes (pan, fit) while a ghost shows: clear on `viewAdapter` change, or redraw? Proposal: clear.
- Which curves a ghost draws (main curves only) is per graph; do we also dim the live curve? Owner feel.
- Hover on touch: none (`pointerType==='mouse'` as `useTip`); touch gets the press jump only.
- Snapshot cost: `exportPreset()` at hover start may be non-trivial on large scenes; cache until a state change.
- `src/workspace/presenter`, `DemonstrationWorkspace.tsx` and `viewAdapter.ts` are being edited by another worker; the overlay mount point should wait for that merge.
- Decide whether previewable counts of a graph with a coupled state (Taylor degree) are in scope.

## Handler decisions (handler 6, 2026-11-24)

- Contract (1) accepted as proposed: `PreviewGeometry` from the Preset snapshot, read at hover start and cached until the next state change; `previewable?: true` on range and count parameters only; `checkDeclaration` rejects the mark without a function.
- Ghost (2) accepted, except a view change while a ghost shows redraws it from the new box (the function is pure and samples the new `sampledRange`); it is cleared only on hover end, frame change and dispose. The live curve is not dimmed by default; dimming is the owner's at the feel slice.
- Mouse hover only; touch keeps the press jump; keyboard focus shows no ghost (revisit at the feel slice).
- Worked example: phase portrait `A`. Bézier `t` and Taylor's degree come later (06 slice 2 or 08).
- Split: **06 slice 1** = contract types, `paths.ts`/`sampledRange` moved out, experiment code and the `just preview-measure` recipe removed, the phase portrait's geometry function and declaration mark, the equality test against the live board and the export-unchanged test. No UI. **06 slice 2** = overlay, hover entry points, tooltip key, frame-sampling browser check; it starts after 07 slice 2a is accepted (shared workspace files).
