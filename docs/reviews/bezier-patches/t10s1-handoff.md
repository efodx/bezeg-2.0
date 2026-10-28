# 10S-1 handoff (partial, no code written)

Files touched: none (only this note). No checks run. No new tests, no mutations observed.

## Read so far
TensorDerivativesGraph.tsx/TensorDerivativesScene.ts (template), TensorPatchGraph.tsx, tensorSubdivision.ts (SUBDIVISION_RANGE, subdivisionPieces, locateInPieces, canElevate), patchSceneBuilder.ts, BaseSurfaceGraph/BaseGraph transient-state hooks, TriangularPatchGraph transient pattern (lines 82, 121-126).

## Typing blocker (decide first)
`TensorPatchGraph extends BaseSurfaceGraph<TensorPatchGraphState, ...>` is not generic, and `PatchStateDto` (patchDto.ts) has no subdivision fields. Derivatives precedent: optional fields added to `TensorPatchGraphState` and `PatchStateDto`. Neither file is mine (TensorPatchGraph.tsx belongs to 10J-1; patchDto.ts to 10W), so the new fields `subdivisionDirection`, `subdivisionValue`, `showPieces` cannot be typed without a cast or an edit. Options, for the handler:
1. Handler adds the three optional fields to `TensorPatchGraphState` (small edit, same as derivatives); in `stateDto`/`stateOf` use a local `interface SubdivisionStateDto extends PatchStateDto` (methods are parameter-bivariant, so the override compiles).
2. Make `TensorPatchGraph` generic in its state (larger; collides with 10J-1).
Avoid casts.

## Plan
- `TensorSubdivisionScene.ts` (pure): `buildSubdivisionScene(patch, direction, value, u, v, opts)` returns piece nets (ids `piece-l-row-i`/`piece-l-col-j`, role `net`; `piece-r-...`, role `net-2`), split curve `S(u0,.)` or `S(.,v0)` (role `highlight`, id `split-curve`, 32 samples), labels for both pieces; `pieceCorrespondence(patch, direction, value, u, v)` returns `{location, point}` via `locateInPieces` and evaluates the piece. In the graph's `buildScene`: when `showPieces`, drop `net-row-*`, `net-col-*`, `highlight-row/col` polylines, return `points: []`, `interaction.editable: false`; the mesh stays; otherwise the inherited scene is unchanged.
- `TensorSubdivisionGraph.tsx`: extends TensorPatchGraph; own `routeId` is `patch-subdivision`; starting patches `derivativesStartingPatches` (same four patches, none specific). Public methods for panels: `setSubdivisionDirection`, `setSubdivisionValue` (clamp to SUBDIVISION_RANGE, ignore non-finite), `setShowPieces`, `elevate(direction)` (no-op when `!canElevate`; commits `TensorProductBezierPatch.elevate`, sets m/n, keeps old net as a `compare` ghost with ids `ghost-row-i`/`ghost-col-j`). Ghost is a private field, declared in `captureTransientState`/`restoreTransientState` (cleared by `restoreTransientState(undefined)`, i.e. Preset load and Reset); also cleared in `movePoint`, `setDegree`, `useStartingPatch`. `geometryChanged` includes the new fields and (when pieces shown) `u`/`v`.
- DTO fields for 10W: `subdivisionDirection` (`"u"|"v"` else default `"u"`), `subdivisionValue` (finite, clamped to 0.05..0.95, default 0.4), `showPieces` (boolean, default true); add to `PATCH_STATE_FIELDS`.
- Tests: scene test (piece point equals original point by independent `patch.eval`; piece nets are the `subdivide` result; split curve lies on the surface); graph tests (elevation samples identical before/after; ghost cleared by net edit, degree change, Preset load, Reset; elevate unavailable at degree 4; editable false when pieces shown). One deliberate mutation per assertion group.
- Then `npx tsc --noEmit --pretty false`, `npx eslint <files>`, logs in `.command-logs/t10s1-*.log`.

## Not verified
Everything; nothing is implemented.
