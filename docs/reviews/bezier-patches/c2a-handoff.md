# Slice C2a handoff (partial, context threshold)

## State
All four items are implemented and passing; mutation checks and visual/browser checks are not done.

1. Index selection and xyz editor in Uredi (`TensorPatchPanels.tsx`: `PointEditor`, two index selects, `selectIndex`, `setSelectedCoordinates` in `TensorPatchGraph.tsx`). Finite validation reuses `enter_finite_numeric_coordinates` and `apply_coordinates`. The editor remounts on any coordinate change (key), so it follows drags, degree changes, scene writes and language switch.
2. Highlight polylines `highlight-row` and `highlight-col` in `patchSceneBuilder.ts`. They are shown only with the net visible, and ignored for an out-of-range index. Bernstein weight in `patchBernstein.ts`, shown via `FunctionReadout` (plain text, no MathJax), formatted with `formatNumber(..., 4)`.
3. Inset: `GraphSession.createAuxiliaryBoard(container, options)` returns `{board, release}`. It frees once, on release or on dispose. The pointer-origin refresh moved into a shared private helper. `TensorPatchGraph` owns the board via `setInsetContainer` (panel ref callback in `ParameterInset`), `mountInset`, `syncInset` (in `onStateChange`), and re-mounts in `createMainView`. A drag calls `setParameters(u, v)`, clamped. There is no u/v mirror field.
4. az/el sliders in Prikaz (degrees, azimuth wrapped to [-180, 180), elevation limited to the `top` preset's 1.54 rad). `setCameraAngle` writes radians.

## Decisions and flags
- `BaseSurfaceGraph.selectPoint` now bumps `revision`, because the Three view redraws polylines only on a new revision. The existing test "selecting ... without a revision bump" in `TensorPatchGraph.test.tsx` was changed accordingly.
- A Preset restore clears the selection (existing transient behaviour). The test documents this.
- New CSS is appended to `DemonstrationWorkspace.css` (`.patch-xyz-values`, `.patch-point-editor`, `.patch-parameter-inset`).
- New Slovenian terms (Bernsteinova utež točke, azimut, višinski kot) are added to the table in `docs/localization.md` and the spec's terminology table. The inset label reuses *parametrično območje*.
- `TensorPatchGraph.inset` and `setInsetContainer` are `protected` so tests can reach them.

## Files
`src/graphs/base/GraphSession.ts` and `.test.ts`; `src/graphs/patches/`: `BaseSurfaceGraph.tsx`, `TensorPatchGraph.tsx`, `TensorPatchPanels.tsx`, `patchSceneBuilder.ts` and `.test.ts`, `patchBernstein.ts` (new), `TensorPatchEditing.test.tsx` (new), `TensorPatchGraph.test.tsx`; `src/localization/sl.ts` and `en.ts` (12 `patch_*` keys); `src/graphs/base/DemonstrationWorkspace.css`; `docs/localization.md`; `docs/specs/bezier-patches.md`.

## Checks run (logs in `.command-logs/c2a-*.log`)
- `npx vitest run src/graphs/patches src/graphs/base src/localization`: 41 files, 820 tests passed.
- `npx tsc --noEmit --pretty false`: clean.
- `npx eslint src/graphs/patches src/graphs/base/GraphSession.ts src/graphs/base/GraphSession.test.ts`: clean. The localization catalogs were not linted separately.
- `just build`: passed (warnings present, see the log named in `c2a-build.log`).

## Remaining
- Deliberate mutations, one observed failure each, none done yet. Suggested: drop the `highlight-col` push; change `bernstein` to omit the binomial; remove `point.on("drag")`; skip `release()` in `createAuxiliaryBoard`; remove `syncInset()`; drop the `this.revision++` in `selectPoint`; swap the az/el radian conversion.
- Browser check of the inset board's real sizing, ResizeObserver resize, drag and touch (`touch-action: none`), plus the three-column editor layout at narrow width. This was not exercised in a real browser; the ref and board are only tested in jsdom.
- Keyboard selection is covered only through the native selects, since the Three view itself does not emit `select` from keys.
- Smoke test ($smoke-tester) and a UI review are for the handler.
