# Patch collections: per-collection `state` fields

Finding: `PATCH_STATE_FIELDS` was one list for all six patch collections, so a `patch-tensor` file could carry join, subdivision, ... fields that its graph drops silently.

Facts (graph `stateDto` / `exportPresetData`, and git history of `PATCH_STATE_FIELDS` and the graphs' exports): the list only ever grew; no field was removed or renamed, and no graph ever exported another Demonstration's fields. So no legacy exception is needed.

Lists now (`src/graphs/patches/patchPresetCollections.ts`, `STATE_FIELDS`), each = base + extras. Base: camera, u, v, showControlNet, showIsoCurves, showBoundaryCurves, showShading, isoDensity, shadingDensity.
- patch-tensor: base
- patch-triangular: base + showDeCasteljau (the triangular graph exports it)
- patch-decasteljau: base + showDeCasteljau, decasteljauOrder
- patch-derivatives: base + showTangentPlane, showNormal, showTwist
- patch-subdivision: base + subdivisionDirection, subdivisionValue, showPieces
- patch-joins: base + joinContinuity, joinAlpha, joinV, mB, nB, netB, joinCapstone

A foreign field is refused with the existing `unknown_patch_field` ("neznano polje krpe: state.X" / "unknown patch field: state.X"). `PATCH_STATE_FIELDS` removed from `patchDto.ts` (no other user).

User impact: only hand-edited or foreign-edited files are refused (e.g. a `patch-tensor` file with `subdivisionValue`, `joinContinuity`, `decasteljauOrder`, or a triangular file with `showTangentPlane`). Files the app saved are unaffected (tested per graph).

Tests: `patchPresetCollections.test.ts` (refusal test failed before the change, "accepted: ..."; each graph's export passes its collection check).
