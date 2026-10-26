# Bézier patches handler handoff 2 — 2026-10-26

## Objective and authorization

Continue the user's authorized objective: finish `docs/tasks/bezier-patches` in the handler's chosen order, create subsequent bounded tasks after the renderer ADR, and use fresh successor chats as needed. The user explicitly authorized fresh master first and gave Go. Follow current AGENTS.md, delegation/model routing, context monitoring, small commits and fast-forward pushes to origin/master. This is the same ongoing objective.

## Checkout and completed work

Primary checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, branch master. Fetched at start and before push; origin/master stayed e0191c0 until this handler pushed. Current HEAD/origin/master **6e444c3**, with two new commits:

- `99401e3`: diagnostic and teapot research evidence; truthful partial task02 status and prototype report.
- `6e444c3`: accepted task04, optional z coordinates, curve operations, planar guards, tests, architecture/roadmap/spec/task status and pinned-runtime evidence.

Both pushed successfully via `git push origin HEAD:master`. No rebase changes or conflicts. Deployment CI was not awaited; no hosted acceptance claim.

Task04 is complete. Final `just check` passed194files/3773tests, typecheck/lint without exclusions and production build, using pinned JSXGraph1.14.1 in an isolated source snapshot. Final idle matched Chromium156.0.8078.4 drag: medians2.7→2.9,4.2→4.1,3.6→3.4ms,16.7ms median frames and matching endpoints. Small synchronous tail increases remain documented; no zero-overhead or physical-phone claim. See committed `3d-points.md`, `points3d-drag.json`, and `points3d-source-snapshot.json`.

The handler repaired avoidable coordinate-array allocation in the degree-four-and-up scratch path and ensured all-zero-height nets return to 2D kernel rows. Added observed kernel-input dimensions/row-reuse checks through3D→2D→3D. Deliberate trim-removal mutation fails exactly that assertion; restored source26focused tests pass. Prior handler's independent math/engineering review findings were already repaired. No routes/controls changed; task04 explicitly excludes smoke.

## Critical dependency/environment finding

The primary **installed** `node_modules/jsxgraph` is **1.9.2**, despite package-lock pinning1.14.1. `npm ls` confirms invalid install. This explained the baseline `board.sketches.filter` failure: on1.14.1 the original assertion passes unchanged. No test or production sketch fix was made. Cause/timing of mismatch unknown; do not attribute it to another process. All earlier runtime-unverified drag/prototype claims are superseded.

Automatic approval review rejected root `npm ci` because replacement could disrupt shared dependencies. Root `node_modules` is an ordinary directory; old baseline archives link into it. Do not bypass the rejected replacement. A safer independent install was approved and completed:

- `.command-logs/patches-acceptance`: git archive e0191c0 plus exact final task04 source, **independent** npm-ci lockfile dependencies1.14.1, final passing build.28changed source hashes match committed source; source record is committed.
- `.command-logs/patches-baseline`: unchanged e0191c0 archive and build; its node_modules junction points **only to isolated acceptance dependencies**. Do not recursively remove the junction's target.

Run further verification from the isolated directory or another independent pinned install, not the mismatched primary install. The server takes process.cwd() as its root; run prototype server from the isolated root so `/node_modules` serves1.14.1. Copy primary prototype edits to the isolated prototype directory before browser checks. Assert `JXG.version === '1.14.1'` in browser evidence. Main source paths remain the editing source of truth.

One final-source full check hit Windows UNKNOWN opening a generated Vitest cache file (GraphHost suite load;3759tests passed). Verified isolated cache path, deleted only that cache and reran unchanged source; full3773pass above. Exact logs in `3d-points.md`. No failure remains open for task04.

## Task02: next bounded work

No renderer decision/ADR exists. Prototype source remains local at `docs/prototypes/bezier-patches/` (5files including new `verify-functional.mjs`). Committed `prototype-repair.md` supersedes the old renderer handoff's interaction state. Its source has been repaired to remove3D elements via view ownership, retain edited nets across same-kind display changes, and defer triangle-face rebuilds to point release so dragging does not destroy the active point.

Observed on pinned1.14.1: tensor XY movement preserves z, changes visible surface and fixes camera; z mode preserves XY/camera; mouse and keyboard orbit; both parameter inset/construction movements;64triangle faces at tiling8; mesh point drag. These are partial worker assertion observations, not completed delegated smoke, screenshots or performance acceptance.

SVG initially exported740kB surface with no labels because59labels were sibling HTML `.JXGtext` nodes. Worker added visible-label→SVG-text serialization and PNG blob error checks. Rerun reached export but was stopped for exclusive handler timing. **Post-fix SVG/PNG, Presentation/resize, repeated dispose/remount/listener counts, and touch remain unverified.** Functional script is portable now and asserts runtime1.14.1; use default Playwright Chromium (root installed Playwright successfully launches156.0.8078.4 with elevated exec). Worker initially tried Edge; no equivalence claim. `node --check` passes for prototype/server/functional harness.

Continue in small slices:

1. Finish functional/export/lifecycle/touch verification and repairs; preserve nonempty geometry/movement assertions. Use delegated smoke skill for independent stable-browser verification. Run previews/Playwright require_escalated from first attempt. Check correct checkout/runtime before attributing evidence.
2. Collect preset-view depth-order screenshots, desktop and responsive/touch evidence; optional physical phone per guardrails. Build measurement harness for actual drag/orbit/u-v sweeps at8/16iso and8/16shading. Run idle, without tests/build/other browsers. Object rebuild time alone is not frame latency.
3. Use actual32patch teapot data, not repeated patches. Committed `teapot-data.md` verifies three.js r180 MIT source,32explicit patches/290points and transforms. Before extracting assets/golden data, fetch/hash pinned source and cross-check Bernstein corner orientation against its evaluator; no dataset asset exists yet. Preserve license/attribution. Source research is guidance, not measured feasibility.
4. If JSXGraph fails a must-have (depth, usable drag or8×8frame budget), prototype the SAME scene with isolated lazy three.js before choosing renderer. No three dependency or production migration has been authorized by partial findings alone; task02 authorizes the isolated fallback if needed.
5. Write measured renderer evidence/budgets and accepted next-free ADR, link spec. **Only then** create subsequent bounded task files for patch math, adapter+tensor, triangular, remaining demonstrations, chapter/lessons/previews and integrated acceptance; continue objective.

## Dirty ownership, workers and processes

`git status` after push: untracked `.worktrees/` (pre-existing, other chats), `docs/prototypes/bezier-patches/` (our unfinished prototype), old `3d-points-worker-handoff.md`, `handler-handoff-1.md`, `renderer-prototype-handoff.md`, and this new handoff. No dirty tracked production source. Preserve unrelated changes made after this snapshot. Old handoffs can be retired after unique evidence is retained; current committed reports carry accepted decisions/results. Prototype code is throwaway per task02 and has not shipped to master; decide reproducible prototype revision evidence when closing ADR.

All workers completed. Pointer diagnosis worker60693input; prototype repair117269; teapot research76378 (watcher completion events). Requested fresh GPT-6 Luna high/handoff-v12; runtime model resolution not exposed. They did not delegate or commit. Handler self monitor started31436,147096 observed at19:00:36UTC; completing closeout near150k. No further slice began after this boundary. Evaluation records committed; no total-usage/model-efficiency inference.

Owned previews4410/4411 (exec43182/42287) stopped via Ctrl+C at closeout; final drag90682 and check59910 finished0. Prototype worker reports stopped server92728/browser62038 and free4181. Watchers4213/37455/37253 completed; no intentional active writer/process. All workers' report gaps are retained. `build/` in primary is older/untrusted for these acceptance claims; isolated builds are the verified ones.

Saved project verified by list_projects: Bezeg `6466c495-4851-4845-83b4-a5801d449d35`, exact primary path. Create successor in its **local** environment, no worktree/default branch switch. User did not select model/effort; omit overrides to retain configured defaults. Permission workspace-write/auto-review. New handler must inspect Git and its own telemetry, preserve dirty prototype, and continue without concurrent old handler writes.
