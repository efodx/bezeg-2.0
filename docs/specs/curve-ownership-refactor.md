# Curve ownership refactor

Approved direction: the owner authorized implementation of the [architecture assessment](../curve-architecture-deep-dive.md) on 2026-10-09. This is the first bounded production refactor in that direction, retaining JSXGraph and all mathematical algorithms. Subsequent scene/command migration and renderer comparison remain separate slices.

## Outcome and scope

Reduce coupling with real owned modules: editable numeric geometry inputs cease to read renderer coordinates; a graph runtime owns board lifetime and deferred work; figure capture leaves the React graph base. Apply shared behavior to existing demonstrations without redesigning their controls. Preserve all 26 routes, current `/bezeg-2.0` hosting, legacy preset identifiers/import format, localization, lessons, constrained spline points, Farin editing and PH semantics.

### Geometry slice

Use numeric model points for editable control inputs, with adapter-owned synchronization of drag edits and mathematical transforms. Keep function-backed dependent geometry and existing evaluation/cache semantics. Mathematical objects must not receive board-backed point wrappers for editable polynomial/rational/spline inputs or PH generating points. Preserve point role constraints and separate model versus board object identity. Correct rational point/weight deletion alignment as an explicit bug fix: deleting point i removes weight i, retaining all other weights. Do not change rational singularity semantics, solver algorithms, general degenerate-input policy, sampling quality or cache granularity in this slice.

### Runtime slice

Introduce an owned graph/board session with explicit lifetime, subscription and deferred-refresh ownership. Base graph owns its session rather than conditional cleanup tied to workspace metadata. Resize observation, board listeners and pending drag refreshes terminate on disposal; remounts are safe. Board creation and mathematical drawing still use JSXGraph. Existing graph commands/lesson actions and state remain compatible; this session is a lifecycle foundation, not a claim that every graph state field has migrated into one renderer-independent scene model.

### Export slice

Move SVG/PNG capture and download resources into a figure-export module with an explicit board/container dependency. Preserve filenames, SVG renderer-tree contents, PNG DOM capture, ZIP output, export language lock, assistive MathJax handling and visible errors. Scope capture styling to the target container and restore original style values on success/failure. Owned asynchronous work must not download or enqueue figures after its graph session is disposed. A stable current-board readiness check must include pending model/board work and MathJax completion, rather than a fixed 100 ms preset-remount delay. Batch capture should operate through a live graph owner, await each scene, restore the entry scene, and keep batch blobs local to the job. Preserve the default and saved-preset scenes; do not overwrite browser presets during capture.

Batch animation policy: stop running De Casteljau playback before scene replacement. Restore its entry parameter with playback paused and consistent Play/Pause controls; do not automatically restart it after capture. This is the deliberate exception to restoring transient runtime state. Retain selection, editing mode, main/PH editor viewports and subdivision limits. Scene-operation cancellation must suppress queued mutations after timeout or owner disposal, and overlapping jobs must not interleave on one owner.

## Acceptance criteria

1. Mathematical endpoint/reference, subdivision/elevation and construction checks remain passing; point binding tests cover board→model drag, model→board transforms, same-count replacement, deletion and cleanup.
2. All active routes load and representative polynomial/rational/spline/PH dragging and sliders remain visibly responsive. Numeric forms, constrained points, selected-curve gestures, Farin editing and PH child-board behavior remain functional.
3. Repeated navigation, scene replacement and disposal cannot deliver deferred refreshes/capture results into a freed board. Main and auxiliary ownership remains explicit and idempotent.
4. SVG/PNG contain the expected geometry; capture errors restore styles/export locks. Batch figures match selected presets, including formulas where supported, and the entry scene is restored on success/failure.
5. Preset/import shape, storage namespace, route paths, languages and current educational features remain unchanged. No dependency/build-tool/renderer migration, deployment or push.
6. TypeScript and production build pass; appropriate Jest and automated browser checks pass. A delegated browser smoke check covers remaining shared lifecycle, lesson, PH, narrow and keyboard workflows; blocked/skipped physical-device or tool coverage is reported honestly.

## Verification and ownership

Main chat coordinates specs, review, integration verification and commits. GPT-6 Luna Max workers own bounded code slices under [agent workflow](../agent-workflow.md); no further delegation by workers. Use mathematical and engineering reviewers in parallel for the integrated substantial diff. Runtime and export share BaseGraph: serialize integration edits with one owner. Documentation updates describe what actually shipped and what remains.

No performance gain is promised. This preserves update/sampling policy and mathematical meaning; a renderer or scheduling optimization needs the existing [performance protocol](../performance-plan.md).
