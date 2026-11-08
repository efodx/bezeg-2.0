# Phase 2a notes: sampled lesson-restoration, scene-content and scene-replacement sweeps

Tier on each scoped file: sampled locally, full in CI. Scope function: `sweepScope` in `scripts/transient-state-scope.cjs`
(variables BEZEG_LESSON_RESTORATION, BEZEG_SCENE_CONTENT, BEZEG_SCENE_REPLACEMENT, BEZEG_SWEEPS=all); applied by
`src/graphs/base/catalogSweepScope.ts`; provided in `vite.config.mts`.

## Sample sizes (observed)

- Lesson restoration and scene-content lessons: 19 of 118 guided lessons (14 transient-state-sample graphs plus the first
  lesson of 5 families the sample misses: curve-parametric, linear-function, bspline-basis, spline-parameterization,
  prob-density). Restoration mechanisms come from the transient-state sample, not from lesson data.
- Chapter activities: 3 left out of the total (activities whose graph is in the lesson sample are kept).
- Scene replacement leak loop (x2 entries): first Demonstration of each family plus patch-tensor; 101 left out.

## Timings (Vitest results.json, per-file wall seconds, 2 workers, same machine, back to back)

| file | before (all, BEZEG_SWEEPS=all) | after (sampled) |
|---|---|---|
| lessonRestoration.part1 | 131.4 | 15.6 |
| lessonRestoration.part2 | 153.2 | 43.0 |
| lessonRestoration.part3 | 160.4 | 13.9 |
| lessonRestoration.part4 | 166.5 | 38.8 |
| sceneContentAgainstGraphs | 110.5 | 27.9 |
| sceneReplacementContract | 120.5 | 39.9 |
| total tests | 688 passed | 186 passed, 8 skipped |

"Before" is the same code with BEZEG_SWEEPS=all, which runs every entry (acceptance 4: 688 tests, equal to the old
unscoped run). The branch changes vite.config.mts, a shared path, so the default scope here is all; the sampled runs
set each variable to `sample`, which keeps the changed-file selection but skips the shared-path rule.

## Fault detection

- (a) `EpicycleGraph.restoreTransientState` made to restore 1.234 instead of the saved time, graph not in the sample:
  `BEZEG_LESSON_RESTORATION=sample just unit src/learning/runtime/lessonRestoration` selected `epicycles` (class
  EpicycleGraph named like the changed file) and it failed: 1 failed, 39 passed, 4 skipped. Reverted.
- Content file: whitespace appended to `bezierClippingGuidedLessons.ts` added `bezier-clipping` to the sample run
  (20 lessons instead of 19). Reverted.
- (b) `sweepScope` with a changed `src/graphs/base/BaseGraph.tsx` and default env returns `all: true` for all three
  new sweeps (node check; the unit tests cover it too).

## Not verified / later slices

- `.github/workflows/browser-smoke.yml` line 41 runs `node --test scripts/ci-change-scope.test.cjs scripts/transient-state-scope.test.cjs`;
  no new test file was added (the new cases are in `transient-state-scope.test.cjs`), so no workflow edit is needed.
- Default (unset) scope was not run end to end on a branch without shared changes; the three sample runs used `=sample`.
- The scope tests were written together with the implementation, not observed failing first (the two existing deepEqual
  tests did need the new `changedFiles` field).
- CI behaviour with `CI=true` is covered by node tests only, not by a Vitest run.
