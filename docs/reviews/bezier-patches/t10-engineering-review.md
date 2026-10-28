# T10 engineering and UI review (c78b441..3c38f9c)

Read-only review from code. `npx tsc --noEmit` is clean; sl/en key sets are identical (diffed). Nothing was run in a browser.

Counts: high 0, medium 1, low 5.

## Medium

1. TensorSubdivisionGraph.tsx movePoint override (about line 120) and TensorJoinPanels/TensorPatchPanels PointEditor: `movePoint` silently returns while pieces are shown. If a point was selected before "Show the pieces" was switched on, the A point editor stays visible and Apply does nothing, with no message beside it (the lock note is only in the Split group). Fix: clear the selection when showPieces becomes true (setShowPieces), or disable the editor with the `patch_pieces_locked` reason.

## Low

1. patchPresetCollections.ts:47-62 `checkState` runs for every collection, so a `patch-tensor` (or triangular) Preset may carry subdivision/join fields and `netB`; the route ignores them. Consistent with `decasteljauOrder`, `showTwist`, etc., which are also accepted everywhere and ignored. Acceptable; only a note: a triangular Preset with `netB` is validated but dropped on re-export. No fix required; optionally document "state fields are shared and validated uniformly".
2. TensorJoinPanels.tsx JoinBPointControls `if (aSelected && chosen) setChosen(undefined)` sets state during render. It converges, but is fragile; prefer a `useEffect` or deriving `chosen` from props.
3. TensorJoinPanels.tsx JoinModeControls: the disabled alpha reason is a separate `<p role="status">` not linked by `aria-describedby` to the disabled slider (Slider describes itself only with `help`). Fix: fold the reason into `help` when disabled.
4. TensorJoinScene.ts:97-105: derived B points are in `scene.points` and so look pickable/draggable ("drawn like the others" per legend); `hasPoint` refuses them silently. The legend and mode help say so, but a drag gives no feedback. Consider a distinct point style or a status note on rejected drag.
5. joinStateOf (TensorJoinGraph.tsx ~line 75) and subdivision `stateOf` clamp where the import check rejects (checkJoinState/checkState): fine for import (strict), lenient for internal DTOs; no defect, confirms strict + actionable messages exist for every new field.

## Checked, no finding

- Ghost: captured via `captureTransientState` as a copied net, restored only if `isNet`; `currentGhost` ties it to `ghost.after === state.net`, so any net change expires it. Joins hold no transient state.
- Cache invalidation: subdivision `geometryChanged` covers direction/value/showPieces; join covers netB/joinV; mode and alpha only act through net/netB, and the scene does not read them. `net-2` added to SurfaceRole, SURFACE_COLORS, SURFACE_DASH together.
- Hooks (`settleNet`, `framedPoints`, `netWithDegree`): defaults are identity / `net.flat()` / the old elevate-or-lower code, so tensor, decasteljau and derivatives behave as before (setDegree path unchanged apart from refactor).
- No `any` or casts beyond the existing `as const satisfies` / tuple idiom seen in the diff; `data as PatchCollectionPresetData` pre-existed.
- Preview-recipe change: `controlPointCount` is read only from `recipes[id].framing`; only `patch-subdivision` declares 0, every other route still needs `> 0` (spec, recipes and smoke-catalog all branch on `undefined`). The `projected` check weakens only for declared-0 routes (camera distance finite). Not weakened for other routes.
- Help text: green solid net, burnt-orange medium-dashed `net-2`, blue solid `highlight`, teal long-dashed `compare` ghost all match SURFACE_COLORS/SURFACE_DASH; net vs net-2 and ghost differ by dash, not colour alone. Arrows are told apart by label (`S_{A,u}`, `S_{B,u}`) plus hue.
- Slider `disabled` is wired to both the range and the NumberInput. Controls use labelled ChoiceSelect/Slider/Button/OnOffSwitch; elevate buttons disabled with a `role="status"` reason; showPieces switch lives only in Prikaz (one home).
- Not verified: rendering, narrow-width layout, actual keyboard walkthrough, and whether the host can pick derived B points.
