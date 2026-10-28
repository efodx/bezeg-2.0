# t09b2 engineering + UI review (da0dbf2..71c2773)

No high findings.

## Medium
1. UI: derivative readout placement. TensorDerivativesGraph.tsx workspaceEdit puts DerivativesReadout after the whole Uredi panel (after Bernstein readout). The corner buttons already sit with the u/v sliders (pointExtra, TensorPatchPanels.tsx:137), but the numbers they change are far below; on a short panel the student must scroll to see S_u etc. and the degenerate status. Remedy: render the readout (and the role=status text) via pointExtra right under the corner buttons, or move it above the Bernstein readout.
2. a11y: S_u and S_v are both solid lines (threeSurfaceView.ts SURFACE_DASH); they differ only by hue (blue/crimson) plus tip labels. Legend relies on "blue/red". Fails "not by colour alone" for the two main arrows. Remedy: give one a dash or a different head/width, or keep labels and state in help that labels S_u/S_v mark the tips.
3. Test vacuity: patchPresetCollections.test.ts:246 "rejects showTwist as number/string/null" - the rejection message also arises from unknown_patch_field ("state.showTwist"), so the test would still pass without the PATCH_STATE_FIELDS addition; the real validation is the generic /^show/ BOOLEAN_OPTION regex. Remedy: assert the reason id/text is the invalid_option one. The positive accept test (line ~240) is not vacuous.

## Low
4. surfaceScene.ts / threeSurfaceView.ts: scene extent (extentOf, ~line 498) ignores planes, so a tangent quad extending beyond net+arrows does not scale dashes; harmless but the contract says planes are scene content. Also planes are not in camera fitting.
5. TensorPatchGraph.tsx ~232-239: the old JSDoc "Replaces the patch with one of the default Presets" is now orphaned above the new startingPatches() docblock (two stacked comments); move it back onto useStartingPatch.
6. TensorDerivativesPanels.tsx: corner buttons render text "(0, 0)" with aria-label "Set (u, v) to the corner (0, 0)": label is fine, but visible text differs from accessible name only by prefix (ok for WCAG 2.5.3 label-in-name? visible text is contained after the prefix, not at the start) - low risk. Keyboard: plain Buttons, fine.
7. Twist dash 0.008/0.010 of extent is very fine; dotted may look solid when projected at small sizes. Verify visually.
8. Legend help is plain text "S_u" (not LaTeX); acceptable outside lesson prose, but panel elsewhere uses <var>S<sub>u</sub></var>; consider consistency.

## Checked, no issue
- planes? is optional; consumers (threeSurfaceView, FakeSurfaceView.sceneSignature, assertFiniteScene) all use `?? []`; other builders (patchSceneBuilder, Triangular, DeCasteljau) do not set it. No other scene consumers found.
- Plane lifecycle: geometries flagged ownsGeometry and disposed in clearLayer; shared plane/outline materials are track()ed; rebuilt only per revision in rebuildGeometry; depthWrite false so no occlusion.
- startingPatches hook: default returns defaultPatchPresets and the panel prop defaults to it, so patch-tensor/decasteljau are unchanged. New state fields are optional and never written by those graphs. Derivatives Reset/Preset/getInitialState all go through stateOf with defaults true; old Presets without the fields show all switches (documented). Switch preservation in useStartingPatch works (double setState known as E4).
- DTO: showTwist added to PATCH_STATE_FIELDS; shared by all patch collections (patch-tensor will now accept, and ignore, showTwist) - harmless.
- sl/en keys in lockstep, placeholders {value0},{value1} match; Slovenian terms (tangentna ravnina, normala, mešani odvod) sound; degenerate text uses role=status.
