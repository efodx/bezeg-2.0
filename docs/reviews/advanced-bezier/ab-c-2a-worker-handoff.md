# AB-C-2a handoff (partial, budget reached)

## Files (all new unless noted; nothing committed)
- src/graphs/patches/coonsScene.ts (+ coonsScene.test.ts): pure state/scene: default boundaries, corner linking, moveCoonsPoint, snapCoonsCorners, coonsNet, buildCoonsScene (one mesh, 12 linked / 16 unlinked points).
- src/graphs/patches/coonsPresetCollection.ts (+ coonsPresetCollection.test.ts): key patch-coons, data [["CoonsPatch", dto]], kept local.
- src/graphs/patches/CoonsPatchGraph.tsx, CoonsPatchPanels.tsx (+ CoonsPatchGraph.test.tsx, CoonsPatchLifecycle.test.tsx).
- src/localization/sl.ts, en.ts: 31 coons_* keys appended (lockstep). Slovenian "premonosna ploskev" for ruled surface is my choice, not in the spec's term table.

## Decisions beyond the brief
- Linked flag with mismatched corners in an imported file: REJECTED (coons_linked_corners_differ); relinking in the app snaps.
- Coordinate limit |x|<=1000 (COONS_COORDINATE_LIMIT). Unknown fields rejected.
- Linked corner: scene draws one point (canonical c0-0, c0-3, c1-0, c1-3); non-canonical ids are accepted and mapped.
- Interior net is polylines only (not draggable); centre readout is always the Coons patch S.

## Checks observed
- tsc --noEmit: clean (before tests were added; not rerun after).
- coonsScene.test: 12 passed. CoonsPatchGraph.test: 14 passed. coonsPresetCollection.test passed after setLanguage("en") fix.
- CoonsPatchLifecycle.test: 1 FAILING. After unmount of cycle 0 the probe counts document listeners 1 vs baseline 0 (outstanding() list empty). Persists with the edits removed (I tried that, then restored the edits), so it is not from my edits. Unknown cause: possibly a document listener from the edit-panel/GraphHost not present in the tensor test, or the lack of the orbit interaction/flush the tensor test performs. Next: compare with jsxSurfaceLifecycle (add view.flush() before unmount; check whether baseline probe.count() was taken before first render's listeners; try the same with TensorPatchGraph in my file).

## Not done
- lint (just lint src/graphs/patches src/localization), wider unit (src/graphs/patches src/localization), tsc rerun.
- All mutations (none run).
- Smoke test not applicable (unregistered).
