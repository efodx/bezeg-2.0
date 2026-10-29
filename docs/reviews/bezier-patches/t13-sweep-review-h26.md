# Task 13 sweep review — handler26

Requested review settings: GPT-6 Luna, high. Runtime-resolved settings were not exposed to this reviewer.

## Result

No correctness finding in the reviewed diff. The `v` section is opt-in through the transient `showMovingVSection` state; it is absent by default and omitted from Preset DTOs. Only `patch-v-sweep` play/replay enables it, and `u` play/replay clears it. Explicit `v` stop clears the overlay; pause preserves the current section. Scene replacement and checkpoint restoration rebuild graph state with the flag false or restore the captured flag. Closing an incomplete active lesson stops the animation driver, cancels pending frames, and restores the exact checkpoint. Unmount stops the driver before view disposal.

The curve samples evaluate `S(u,v)` at the current `v`. For each net row, the control point uses the Bernstein-weighted sum across that row's `v` coordinates, which is the Bézier control point for the fixed-`v` curve. Test expectations independently sum Bernstein weights and inspect the `FakeSurfaceView.last.polylines` produced by a mounted `GraphHost`; explicit presence, 33-sample count, coordinate comparisons, movement, and removal assertions make them non-vacuous. The quadratic fixture also checks its middle control has height `0.6`, distinct from the curve midpoint's `0.3`.

Narration correctly describes a fixed-`v` curve moving with its control polygon while the marked point remains at `u=1/2`. Existing tensor scenes get no overlay unless the lesson action enables it; the added branch is in the tensor scene builder, so triangular comparison and its constructions are unaffected.

## Coverage limit

Low: added overlay-specific tests cover explicit pause/stop and active-lesson close/restore, but do not assert the overlay state directly through a standalone reset or navigation/remount. The state initialization, shared scene-replacement lifecycle and existing sweep-disposal tests support those paths; no defect was observed.

## Verification

`just --list` reviewed before running checks. Passed:

`just unit src/graphs/patches/TensorPatchGraph.test.tsx src/graphs/patches/patchSceneBuilder.test.ts src/graphs/patches/TriangularTensorComparison.test.ts src/learning/content/patchGuidedExamplesBasics.test.tsx`

No build or preview run. Review was read-only apart from this note; source files and Git state were not modified.
