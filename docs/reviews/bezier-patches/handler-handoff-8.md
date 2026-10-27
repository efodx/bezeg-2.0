# Bézier patches handler handoff 8 — 2026-10-27

Current entry point; supersedes [handoff 7](handler-handoff-7.md) for environment and task 07 state. Claude handler (Opus 5.5, auto permission mode) on the destination machine, checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`, branch `master`. Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push, successor handlers).

## Environment (resolved)

A clean root `npm ci` on this machine succeeded and installs JSXGraph 1.14.1 from the lock. Handoff 7's rejected-root-install and isolated `.command-logs/patches-acceptance` environment applied only to the old PC; neither exists or is needed here. `three@0.180.0` and `@types/three@0.180.0` (the prototype's measured r180) are pinned exact in package.json/lock.

## Pushed this phase (origin/master)

- **d58262d** — Three pin + `src/graphs/patches/surface-view/` (Slice A): `surfaceScene.ts` plain-data scene/edit/view types and `assertFiniteScene`; `surfaceMath.ts` camera/fit/drag math and `CAMERA_PRESETS`; `threeSurfaceView.ts` `ThreeSurfaceView` (`attach(host,{ariaLabel})`, `reconcile`, `onEdit`, `setAriaLabel`, `capture`, `fitCamera`, `dispose`; options `{loadThree?, createRenderer?}` for tests). 23 tests with mutation evidence (dispose, z-axis, attach cancellation, listener removal, reconcile emits nothing, horizontal FOV fit, selection retention, occlusion, drag plane). Host must bump `scene.revision` whenever polylines/mesh change; orbit intents are relative to the last reconciled camera. Not verified in a real browser/WebGL.
- **418ee03** — `src/graphs/patches/patchDto.ts`, `patchPresetCollections.ts` (+34 tests) and 14 sl/en keys (Slice B). Data `[["TensorProductBezierPatch", {m,n,net,state?}]]` / triangular `{n,net,state?}`; state `{camera,u,v,show*}`; rejects length, degree, non-finite, unknown field, weights, bad camera/parameter. `defaultPatchPresets` ids `bilinear-saddle`, `bicubic-dome` (camera values placeholders). Not yet registered in `src/graphs/base/presets/PresetImport.ts:11`.

Checks at 418ee03: `just unit src/graphs/patches` 57/57, `just typecheck`, lint of new files, `just check-localization` (worker B). Full `just check` not yet run on these commits.

## Uncommitted (preserve)

- `src/localization/sl.ts`, `en.ts`: 31 additional keys from the C1 worker (`patch_*`, `surface_*`, `bezier_patches`, `tensor_product_bezier_patch`, `prompt_patch_*`). `just typecheck` and `just unit src/localization` pass with them; wording not yet reviewed.
- `docs/reviews/bezier-patches/tensor-workspace-c1-handoff.md`: C1 worker's design and seam findings (file:line). **Read it before C1.**
- `debug.log` (pre-existing, unrelated).

## Remaining task 07 steps, in order

1. **C1 (not implemented):** BaseGraph/GraphSession seam (`createMainView`, `hasBoard` guards, `GraphSession.adoptMainView`), `TensorPatchGraph` with injectable view factory, family `patches` + `patch-tensor` catalog/factory/route, importer registration, Uredi (m,n 1–4 with exact elevation on raise / uniform resample on lower; u,v sliders) and Prikaz (visibility, iso/shading density 8/16, camera presets, reset view, z-mode) controls, transient selection, camera fit, `figurePresetGraphState` override, additive `isoDensity`/`shadingDensity` DTO fields. Open blockers named by the worker: `src/demonstrationPreviewAssets.ts:49` needs a `patch-tensor` entry (decide a placeholder until task 13); the transient-state harness (`realGraphScenes.ts`, `realGraphTestHarness.tsx`, `graphTransientStateContract.tsx`) assumes a JSXGraph board and must be generalized. The original C1 worker spent its 135k budget on investigation: size the next C1 brief smaller — split seam+harness generalization from graph+controls.
2. **C2:** 3D numeric xyz editor + index selection, JSXGraph square inset owned by GraphSession, Bernstein weight/row-column highlight, SVG/PNG export (raster + MathJax labels via `capture()`), Shrani image buttons.
3. Browser verification (handler or bezeg-smoke): real WebGL render, picking, drag XY/z, touch, narrow 390×844 fit, keyboard; ADR0018 budgets (drag next-rAF p95 ≤60 ms, orbit ≤16.7 ms, active frame ≤50 ms) plus separate input-to-visible evidence; full smoke checklist (first surface workspace).
4. Engineering + UI/accessibility review (Sonnet), repairs, `just check`, docs (capabilities, current-architecture, ui-functionality, spec/task status), evaluation-log records for slices A, B, C1, commit and push.

Impeccable (named by task 07) is not available to Claude workers here; follow DESIGN.md and record the gap.

## Settings

Handler: Opus 5.5, auto mode. Workers: `bezeg-worker` Sonnet (C1 used effort high for complex interaction/shared seams), Haiku for Explore/routine review, budgets and watchers per docs/agent-workflow.md. Evaluation records for this phase's dispatches are not yet written (A: 60.7k/19 tools, B: 56.4k/29 tools, C1: 148.9k/56 tools partial, Explore: 101k partial).
