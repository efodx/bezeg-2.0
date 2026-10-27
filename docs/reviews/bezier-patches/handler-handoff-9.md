# Bézier patches handler handoff 9 — 2026-10-27

Current entry point; supersedes [handoff 8](handler-handoff-8.md) for task 07 state (its Environment section still applies). Claude handler (Opus 5.5, auto permission mode), checkout `C:/Users/1337Hacker/Desktop/bezeg-2.0`, local branch `master`. Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push, successor handlers).

## Git state

- Local `master` = `64c4b8b`, two commits ahead of `origin/master` (`fd1f36d`). **Not pushed to master**: the Playwright catalog validator (`tests/demonstrations.smoke.spec.cjs:94` → `tests/smoke-catalog.cjs` `validateGeneratedPreviews`) rejects `patch-tensor` with "Preview manifest must contain exactly one capture for every active Demonstration", so the master push (which runs browser smoke and deploys) would fail. Progress is pushed to `origin/bezier-patches-wip`. Push to master once the validator passes (see step 3 below).
- `debug.log` is pre-existing and unrelated; leave it.

## Accepted this phase

- **7c398ea** (C1a) — `GraphSession.adoptMainView`, `BaseGraph.createMainView` + `hasBoard` guards on every board path; `boardState()` may be undefined and is omitted from lesson states/exports without a board; `Definition.view: 'surface'` → no navigation actions and `surface_gesture_hint`. Mutation evidence recorded in worker report (cleanup registration, navigateBoard guard, hint, nav group, view flag).
- **64c4b8b** (C1b + C1c + handler integration) — `patchSceneBuilder.ts`, `BaseSurfaceGraph.tsx`, `TensorPatchGraph.tsx`, `TensorPatchPanels.tsx`, `FakeSurfaceView.ts`; family `/bezeg-2.0/patches`, route `/bezeg-2.0/patches/tensor`, factory, importer registration; DTO `isoDensity`/`shadingDensity` (8|16) + key `invalid_patch_density`; fitted cameras (dome distance 17.37 target [0,0,1.25]; saddle 12.22 target [0,0,0]; az −0.9, el 0.5; aspect 0.45); `PresetSelector.batchExporter` optional; harness observes board-less graphs via fake view (`createGraph(id)`, `surfaceViewOf`). Details: [c1b-handoff.md](c1b-handoff.md) and worker reports summarized here.
- Handler decisions recorded in code: `patch-tensor` lesson owner points at future section `bezier-patches#curve-to-patch` (task 12 must create it or update the owner); `DemonstrationWithoutLessonId = 'patch-tensor'` in `guidedExamplePreviewCopy.ts` excludes it from preview copy; tests `lessonCatalog.test.ts` and `LearningPage.test.tsx` carry explicit patches exceptions to remove in tasks 11/12; preview recipe placeholder in `scripts/demonstration-preview-recipes.cjs`; neutral placeholder `patch-tensor.png`. Exemption `NO_FIGURE_BATCH = {'patch-tensor'}` in the harness until C2 surface export.

## Checks at 64c4b8b

`just check` at the dirty pre-commit tree: typecheck, lint, 203/204 unit files (3912 tests) passed; the one failure (`Routes.test.tsx` count 45→46) was then fixed and rechecked (unit, typecheck, lint); `just build` passed. Lazy chunk `three.module-*.js` 694,911 B raw / 174,380 B gzip, referenced only by a dynamic import in the graphFactories chunk, not by `index.html`. Not run: browser, smoke, mutation evidence for C1b graph assertions (C1c covered panel/harness mutations; reported gap: harness view signature is redundant with state for camera/points).

## Remaining task 07 steps, in order

1. **C2:** 3D numeric xyz editor + index selection, JSXGraph square parameter inset owned by GraphSession, Bernstein weight / row-column highlight, SVG/PNG export via `capture()` (MathJax labels, occlusion), Shrani image buttons; remove `NO_FIGURE_BATCH` once surface figure export works. Size into ≤25-turn worker slices (two workers likely: editor/inset, then export).
2. **Mutation evidence for C1b graph tests** (point move, camera no-bump, raise exact, lower corners, export round-trip, single dispose, attach rejection) — fold into the C2 review or a small Haiku slice.
3. **Preview capture for surface demonstrations:** the capture pipeline and manifest validator are JSXGraph-centric (board bbox, sceneBounds). Either bring task 13's surface capture forward minimally or define a surface capture contract, then capture `patch-tensor` for real and push master. Do not fabricate manifest evidence.
4. Browser verification (bezeg-smoke): real WebGL, picking, XY/z drag, touch, 390×844 fit, keyboard; ADR0018 budgets + input-to-visible evidence; full smoke checklist (first surface workspace). Measure reconcile cost: the scene is rebuilt in full on every reconcile, including camera orbit and u/v slider changes.
5. Engineering + UI/accessibility review (Sonnet) and mathematical review. Flag for math review: lowering a degree resamples the surface at (i/m′, j/n′) in **both** directions, which also replaces the unchanged direction's control points with surface samples (matches `patch_degree_help` and the plan, but changes the patch more than resampling only the lowered direction would). Prikaz buttons have had no visual review.
6. `just check`, docs (capabilities, current-architecture, ui-functionality, spec/task status, record the 'surface' view breaking-change notes if any), evaluation-log records for slices A, B, C1 (old), C1a, C1b, C1c; commit, push master.

Then tasks 08–14 in index order.

## Worker usage this phase

C1a: Sonnet high, 73.8k / 41 tools, complete. C1b: Sonnet high, 142k / 57 tools, stopped by HANDOFF at 136k (typecheck, lint, build, mutations left; handler finished typecheck/lint/build). C1c: Sonnet high, 121.7k / 76 tools, complete. Dispatch 21:20:46+01:00 for C1a. Effort high chosen for shared seams and complex interaction.

## Settings

Handler Opus 5.5, auto mode; workers `bezeg-worker` Sonnet (high for seams/interaction), Haiku for routine review; watchers per docs/agent-workflow.md. Impeccable unavailable to Claude workers; follow DESIGN.md and record the gap.
