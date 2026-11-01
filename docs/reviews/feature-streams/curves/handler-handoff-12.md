# Curves stream: handler handoff 12

Handler 10 wrote this on 2026-11-01, after the owner resumed it a second time. It supersedes [handoff 11](handler-handoff-11.md). No agents are running. Run state is `active`. Settings are unchanged from [handoff 8](handler-handoff-8.md): handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet.

## Accepted this session

| Slice | Commit on master | Evidence |
| --- | --- | --- |
| F2b registration of `curve-parametric`, `curve-curvature`, `interp-lagrange`, `interp-hermite`, `interp-subdivision`, `patch-coons` (all `lesson: false`) | `2a6e9c4` | Handoff 11 "Checks" (smoke, build, mutation), plus the checks below |

At `2a6e9c4`:
- tsc and lint passed.
- The focused unit run passed: demonstrations, the catalog page, preview assets, `src/learning/runtime`, presets, the transient-state contract and localization.
- `node --test scripts/demonstration-preview-capture.test.cjs` passed 35 tests and failed 1. That failure was already on master and is not ours: the recipe registry lacks `complex-reciprocal`, `complex-roots`, `ear-clipping`, `interval-sweep` and `segment-intersections` (Maps and Geometry streams). All six curves ids have recipes. Mention it to those streams only if it is still failing when you next touch recipes.
- `just check` has not run; it runs once per feature at F6.

Shared conventions settled by other streams and followed here:
- Lesson-less Demonstrations use `LessonlessDemonstrationId`/`GuidedLessonDemonstrationId` in `src/demonstrations.ts`.
- Posters wait in `POSTER_PENDING` (`src/demonstrationPreviewAssets.test.ts` and `src/DemonstrationsPage.test.tsx`) until each family's F5.
- Rebases of registration files conflict with every other stream's registration. Resolve them as unions, and re-derive the hard-coded counts in `src/demonstrations.test.ts`: Demonstration total and family sizes.

## Next steps
1. **Fix the curvature parameter slider (small fix, one worker).** On `/curve-geometry/curvature` the catalog prompt asks the user to move \(t\). `CurvatureBezierCurveGraph.getGraphCommands` (`src/graphs/curves/bezier/CurvatureBezierCurveGraph.tsx:98-110`) appends a "Parameter t" slider. In the production build, the label is in the DOM, but no visible range input changes κ, R or φ, under either the Uredi or the Prikaz tab. Find where curve graphs render graph commands, make the slider reachable and effective, and add a component test that moves it and checks the readout. Browser-check the route after the fix.
2. **F3 lessons** with [one-shot lesson text](../../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31):
   - CG-B1-3 (L1, L2);
   - interpolation I1, I3, I5;
   - D4 `patch-coons`.

   Each lesson slice removes its `lesson: false`, adds its smoke row, its lesson-animation ids (`PARAMETRIC_ROLL_ANIMATION_ID`, `SUBDIVISION_ANIMATION_ID`) and its chapter ownership. It must also update the lesson-less list in `lessonCatalog.test.ts`. The lesson-text claims to include are in handoffs 6 and 7, "Open items for registration".
3. Smoke gaps to cover in the lesson slices:
   - the Coons orbit gesture;
   - narrow-screen interactions;
   - keyboard order;
   - the curvature line case (infinite radius);
   - drag measurements for the Lagrange basis plot and for Coons, per the [performance plan](../../../performance-plan.md).
4. Unchanged: B-spline graphs wait for `G-CURVE`; I2, I4 and PS graphs wait for `G-FN`; AB-B waits for convexity A6. Check the gate rows in `platform.md` on `origin/master`: A7 was accepted on 2026-11-01, so `G-FN` may open soon.

## Lessons
- Memory pressure killed idle background jobs twice: the preview server, unit runs and watchers. Running the 456 s focused unit run in the foreground worked. Check free memory before heavy work, and stop the preview when it is not in use.
- Master moved by about 10 commits per hour. Push a registration as soon as its checks pass, because each delay costs another union rebase.
