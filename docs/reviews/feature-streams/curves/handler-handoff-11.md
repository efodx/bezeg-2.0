# Curves stream: handler handoff 11

Handler 10 wrote this on 2026-11-01, after the owner resumed it. Memory pressure stopped it a second time: Claude Code killed the preview, the post-rebase unit run and the context watcher. No agents are running. Run state is `stopped: low memory killed the post-rebase unit run; resume from handler-handoff-11`. Settings are unchanged from [handoff 8](handler-handoff-8.md). This note supersedes [handoff 10](handler-handoff-10.md). The old remote branch `stream-curves-r1-wip` is deleted.

## Ready to push: F2b registration (one commit, not on master)

`e95484f` on the remote branch `origin/stream-curves-f2b-rebased` is the local `worktree-stream-curves` HEAD. It sits on master `fa0f126`. It registers six Demonstrations with `lesson: false`:
- `curve-parametric` and `curve-curvature` in the new family `/bezeg-2.0/curve-geometry`;
- `interp-lagrange`, `interp-hermite` and `interp-subdivision` in the new family `/bezeg-2.0/interpolation`;
- `patch-coons` in the patches family.

Decisions:
- Handoff 10's `LessonDemonstrationId` type was dropped. Geometry had already added the equivalent `GuidedLessonDemonstrationId`/`LessonlessDemonstrationId` on master.
- Posters follow the shared convention: the six ids are in `POSTER_PENDING` (`src/demonstrationPreviewAssets.test.ts`) and in the matching list in `src/DemonstrationsPage.test.tsx`. Capture belongs to each family's F5. Capture cannot run anyway until every registered id has a recipe: on 2026-11-01 `interval-sweep`, `segment-intersections` and `ear-clipping` had none, and the capture script asserts exact coverage.

Checks:
- **Before the last rebase onto `fa0f126` (at `ef212f8`):**
  - tsc and lint passed.
  - Focused unit runs passed: demonstrations, the catalog page, preview assets, lessonCatalog, `src/graphs/base`, `src/pages`, `src/learning/runtime` and `src/learning/chapter`.
  - Mutation: removing `coonsPresetCollection` from `PresetImport.ts` failed three `PresetCatalog` tests.
  - `just build` passed.
  - A smoke run by `bezeg-smoke` on the built preview at port 4314: all six routes load, the SL `<h1>` and a live EN switch work, there are no console errors, the 390 px layout and 200% text hold, no lesson link is offered, and the catalog lists both new families. Evidence is in the job tmp folder and is not kept.
- **After the rebase:**
  - tsc is clean. The one conflict was the lesson-less id list in `lessonCatalog.test.ts`, where master gave `ear-clipping` a lesson.
  - The focused unit run was killed and has not been seen to pass.

## Next steps
1. In the stream worktree, run `just unit src/demonstrations.test.ts src/DemonstrationsPage.test.tsx src/demonstrationPreviewAssets.test.ts src/learning/runtime src/graphs/base/presets src/localization --maxWorkers=2` and `node --test scripts/demonstration-preview-capture.test.cjs`. If master moved, rebase first; hard-coded counts in `demonstrations.test.ts` (64 Demonstrations, family sizes) and the lesson-less id list may need updating. Then `git push origin HEAD:master`, update the family status rows in `curves.md`, and delete `stream-curves-f2b-rebased`.
2. **Fix the smoke finding on `curve-curvature`** before its lesson (CG-B1-3). The prompt says "Premikaj parameter t po krivulji". The graph adds a "Parameter t" slider through `getGraphCommands` (`src/graphs/curves/bezier/CurvatureBezierCurveGraph.tsx:98-110`). In the browser, the label exists in the DOM, but no visible range input changes κ, R or φ: the readouts stay at κ = 2, R = 0.5 and φ = 0° under the Uredi and Prikaz tabs. Dragging a control point does update them. Find where curve graphs' graph commands render (probably only for a selected curve, or hidden in a collapsed panel), make the slider reachable, and add a component test that moves it and checks the readout.
3. Smoke gaps to cover at the lesson slices:
   - the Coons orbit gesture;
   - narrow-screen interactions;
   - keyboard order;
   - the curvature line case (infinite radius);
   - a drag measurement for the Lagrange basis plot and for Coons, per the [performance plan](../../../performance-plan.md).
4. Then F3 lessons as [handoff 8](handler-handoff-8.md) lists, with the lesson-text items of handoffs 6 and 7. Each lesson removes its `lesson: false` and adds its lesson-animation ids.

## Lessons
- Rebase conflicts in registration files came from other streams adding entries in the same places. They were resolved as unions, after confirming master's equivalent type change. Push registrations as soon as they are verified.
- Memory pressure killed background jobs twice while the session was idle. Run heavy checks in the foreground where they fit in 10 minutes, keep the preview up only while it is used, and check free memory first.
