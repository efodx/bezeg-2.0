# Maps stream: handler handoff 4

Written 2026-10-31 by handler 4 (Opus 5.5, `auto`, effort `medium`) at its 150k soft threshold, with only gated work left. `Run state: waiting on G-REG, G-CG`.

## Done this run (all on `master`)

- Reviews of the linear map graph (linear 05) and the complex reciprocal graph (complex 03): engineering/UI and mathematical, `bezeg-reviewer` Sonnet. Repairs: the linear graph accepts only its drawn modes (`basis`, `determinant`) in `setMode`, lesson `set-mode` and Preset import (`LINEAR_MAP_GRAPH_MODES` in `linearMapScene.ts`; later tasks extend it); the reciprocal graph resets its radius-handle angle on every commit except the radius drag; `complex_recip_note` says arg 1/z = −arg z modulo 2π.
- Lint fix `6c4e553` (unused test constant), requested by the geometry handler because it blocked `just check`. **Run `just lint` on changed paths before pushing**: neither the graph workers nor this handler had run it.
- Complex 03 roots half: `complexRootsModel.ts`, `ComplexRootsGraph.tsx`, `complexRootsPresets.ts`, 43 `complex_roots_*` keys after the `complex_recip_*` block. Reviewed (engineering/UI, mathematical). Default example changed from w = 8i to 2i (outside the shared range [−2, 2]); the spec M2 example is amended.
- `maps-graphs-wip` on `origin` is stale (pre-rebase) and superseded by `master`; leave it or let the owner delete it. Do not force-push.

## Next when a gate opens

- `G-REG`: linear 06 (registration), complex 04 (registration, lessons, chapter). Both register their Preset collections (`linearMapPresetCollection`, `complexReciprocalPresets`, `complexRootsPresets`) and widen the lesson action sets in `src/learning/model.ts` (Platform A10 reshapes that file first). The `linear-map` `LessonAction` kind is not yet produced by any catalog. Smoke-test the new routes then; none of the three graphs has been seen in a browser.
- `G-CG`: triangle geometry kernel (task 01, `src/compgeo/rational.ts`).

## Open notes (low)

- Both complex graphs answer a missing or non-numeric Preset field with the generic invalid-data message, not the field-specific one.
- Linear: the probe is fixed at (1, 1); the drag handles' keyboard path is the numeric fields. Two `role=status` regions in the readout may be chatty while dragging.
- Reciprocal: the circle centre/radius inputs stay editable while the circle is hidden.
- Roots: with w = 0 and the n-gon on, the radius row reads 0 (correct; the zero status explains).
- From handoff 3: `circleInversion` throws on a bad radius (guarded by the graph); `sampleImage` swallows exceptions from `f`.
