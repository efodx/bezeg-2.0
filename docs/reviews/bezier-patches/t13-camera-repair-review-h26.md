# Task 13 camera repair review — H26

Scope: read-only engineering/UI/math-semantics review of the additive `patch-join-scene.view3d` action, authored advanced-example cameras/projection assertions, and the repaired patch guided-example expectation override. Source criteria: [task 13](../../tasks/bezier-patches/13-examples-previews.md) and the lesson action/camera contract in [the Bézier patch spec](../../specs/bezier-patches.md#presets-scene-state-and-lessons).

## Findings

No actionable defects found in this slice.

- `patch-join-scene` is a closed scene union with an optional camera; the feature checks the camera's finite values, positive distance, finite target and supported projection before the graph writes. The actual graph consumer additionally clamps elevation and distance. The authored join and triangular views are inside those limits.
- The action applies `useJoinScene` before its camera override in the same synchronous action. G1 follows its C1 scene action and then applies alpha 2; scene state writes are synchronous, and the focused mounted test checks resulting continuity/report, rendered view, and same-tick progression.
- The independent inventory uses the authored override when present and the selected preset camera when absent. Its regression test distinguishes the override from the saved C0 camera; the runtime test checks the override remains through C1/G1 mode changes. `stateOf`/camera updates construct state values rather than editing the preset DTO, and closing the lesson restores the graph's initial state.
- The authored projection checks project the actual rendered mesh vertices and control points at portrait and short-landscape aspects, require in-frustum coordinates, and enforce nontrivial mesh width/height. Join tests retain the camera while changing modes and restore the original state on close.

The captured pre-repair stale-camera expectation failure was not rerun here; the parent reports the repaired override test and five-test Node run passing. Existing broader dirty task-13 files were treated as the review baseline; this review made no source edits and ran no tests, build, browser, or Git mutation. The only created file is this review note.
