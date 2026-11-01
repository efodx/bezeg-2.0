# Geometry stream — handler handoff 16

Written 2026-11-01 by handler 16 (Opus 5.5, permission mode auto, effort medium) after the 150k soft threshold. Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Previous: [handoff 15](handler-handoff-15.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. Everything below is on **`origin/master`** (`1821bba9`, plus this note's commit). Push only fast-forwards to `master`; never force-push, never push the stale `origin/stream-geometry`.
- `node_modules` is a junction to the main checkout: delete the junction before removing the worktree. Untracked `docs/reviews/**` logs and shots stay uncommitted.
- No worker or preview is running.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Default view of `ear-clipping`, `interval-sweep`, `segment-intersections` | `1821bba9` | `BaseGraph.initialView()` (default `undefined`, the app box `[-5, 5, 5, -5]`); an equal-unit graph returns its default example's extent, which `startingBox()` fits to the canvas aspect with `fitBoundingBox` at board creation and on reload, so both paths give the same box (the transient-state contract "reset matches a new mount" caught a mismatch when the box was not fitted). A Preset's `boardState` still wins. Function graphs keep their own `defaultBoundingBox()` path, unchanged (a first try that unified the two hooks broke function-graph reset sampling and the stub-board `GraphHost` tests). New `compgeoDefaultView.host.test.tsx`; removing an override fails it. Full unit 6970 passed, lint, build; handler Playwright check of the three routes at 1366×768 and 390×844, examples inside the frame, no console errors. Ear-clipping example 2 (\(x\) 0–18) still loads into the current view; Fit shows it. Handler-only (small, coupled to `BaseGraph`). |
| T1 lesson task written | this commit | [triangulation 09](../../../tasks/triangulation-voronoi/09-ear-clipping-lesson.md): decisions on four new overlay names, a `point-set` `set-trace-step` operation (number or `'end'`), `algorithm-trace` on `EarClippingGraph`, interim chapter owner. |

## Next, in order

1. **Triangulation 09 (T1 lesson):** dispatch one `bezeg-worker` Sonnet `medium` with a handoff-v12 brief built from the task file. Name `src/graphs/base/graphTransientStateContract.tsx` and `lessonCatalog.test.ts` among the enumerating tests; ask for an observed mutation failure per new assertion. Then a Sonnet engineering review (scene actions, readouts, counts; not prose) and `just smoke-lesson ear-clipping` or a bilingual walk with a live switch.
2. Convexity 15 F4 chapter, once Maps' `chapterOwnedLessons` reaches `master` (`git log origin/master -- src/learning/content/chapterOwnedLessons.ts`; absent at `1821bba9`).
3. The C1 interval-sweep and C2 segment-intersections lessons (task files not written yet; template: triangulation 09). `applyPointSetAction` `set-points` must pass `this.allowsIntervals()` or segments before a lesson loads such a scene; they can adopt `set-trace-step` from 09. The C2 summary must not claim fewer tests: 9 neighbour tests vs 6 pairs. Each lesson removes `lesson: false` and its id from `lessonCatalog.test.ts`.
4. Then F5 media (posters for all six compgeo ids in `POSTER_PENDING`) and F6.

## Open risks

- Lesson card covers the point cluster at 1366×768 in A2 and A4 (handoff 14).
- Deferred from 13: focus to body after Remove; re-lettering after removal not announced; `orientation-predict` hides `turn` while text names line \(pq\); `checkAuthoredAction` uses global `isFinite`.
- SL prompt wording for the three new Demonstrations has not been read by a native speaker.

## Lessons from this run

- A view hook on `BaseGraph` must not share a name with `BaseFunctionGraph.defaultBoundingBox()`; the two paths have different timing (function graphs reset their view in `initialize()`).
- JSXGraph `initBoard` and `setBoundingBox(box, true)` treat a box whose aspect differs from the canvas differently (the latter crops); fit the box to the canvas first when both paths must agree.
- A focused Playwright script in the job tmp (`#jgbox`, `window.JXG.boards`) was enough for a three-route view check; no smoke worker needed.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`medium` for graphs, registration and lessons, `high` for exact kernels); reviews `bezeg-reviewer` Sonnet; first-sight smoke `bezeg-smoke` Sonnet, narrow rechecks Haiku.
