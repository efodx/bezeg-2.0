# Task 13 sweep controls fix (H26)

The sweep controls were attached to the explanation frame. `GuidedLesson` only registers graph-side controls while the session is in `explore`, and the normal Next/Observe transition selects the observation frame. That left the graph action area empty even though the chapter example described a moving cross-section. No runtime change was needed.

Moved `patch-v-sweep` onto the observation frame and updated its bilingual copy: the prepared scene starts at `v=1/2`, and Play moves the fixed-`v` cross-section while the marked point stays at `u=1/2`.

The focused regression renders the real `patchGuidedExamplesBasics['curve-to-patch']` in `GuidedLesson`, with the real `TensorPatchGraph` capabilities, and forwards the registered graph actions through a small graph-action host. Before the source correction, after advancing to the observation frame, the graph action area contained no animation controls. After the correction, the test advances and selects “Observe on graph”, finds the registered Play control, activates it, and verifies the sweep curve/control polylines and a changing `v` value.

Verification: `just unit src/learning/content/patchGuidedExamplesBasics.test.tsx` passed (8 tests; log `.command-logs/2026-10-29T17-53-39-030Z-39036-9032bd17.log`). The earlier red run showed the missing accessible animation control group at the real UI seam. No build or browser run was performed. The supplied production preview at port 4394 is still the frozen older build, so the assigned production browser recheck remains with the handler.
