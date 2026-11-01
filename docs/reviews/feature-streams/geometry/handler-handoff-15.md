# Geometry stream — handler handoff 15

Written 2026-11-01 by handler 15 (Opus 5.5, permission mode auto, effort medium) after the 150k soft threshold. Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Previous: [handoff 14](handler-handoff-14.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. Everything below is on **`origin/master`** (`71457f96`, plus this note's commit). Push only fast-forwards to `master`; never force-push, never push the stale `origin/stream-geometry`.
- `node_modules` is a junction to the main checkout: delete the junction before removing the worktree. Untracked `docs/reviews/**` logs and shots stay uncommitted.
- No worker or preview is running.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Sweep 09 Bentley–Ottmann graph accepted | `a2e28387` | Sonnet engineering+math review: two medium findings repaired by the handler. (1) Fraction text now uses U+2212 like its decimal (`−3/4 = −0,75`); new unit test, and the mutation failed 2 tests. (2) The perf test is opt-in (`BEZEG_PERF=1`, `BEZEG_PERF_OUT`, ceiling 1000 ms) and no longer writes into `docs/reviews/` in the unit suite. Sonnet UI/a11y review: no high or medium; lows accepted (listed in the 09 task). Full unit 6934 passed, lint and build passed. |
| Triangulation 08 and sweep 10 registration | `71457f96` | Routes `/compgeo/ear-clipping`, `/compgeo/interval-sweep`, `/compgeo/segment-intersections`, all `lesson: false`, posters pending (F5). Sonnet worker, then handler fix: `PRESET_DATA_STATE_KEYS` in `graphTransientStateContract.tsx` (3 failures in the full suite; 6961 passed after). Sonnet smoke passed 8 checks × 3 routes, no console errors; shots in `10-shots/`. |

## Next, in order

1. **Default view follow-up (small; handler or one worker):** the app default box `[-5, 5, 5, -5]` (`BaseGraph.tsx:71`) puts the C2 example's upper endpoints at \(y=5\) on the board's top edge. The sweep line at the first events sits on the frame (`10-shots/segment-intersections-sidelists-1366.png`). Check the interval sweep (spec example spans \(x\) 0–10) and ear-clipping shots too. Find how other graphs override their default view (`grep -l "BoundingBox" src/graphs/functions/*.tsx`), give the three graphs a view that fits their default example with a margin, and keep Preset `boardState` restore working. Focused browser check of the three routes after.
2. Convexity 15 F4 chapter, once Maps' `chapterOwnedLessons` reaches `master` (`git log origin/master -- src/learning/content/chapterOwnedLessons.ts`; it was absent at `71457f96`).
3. Lesson slices (F3), now unblocked by registration:
   - T1 ear-clipping lesson.
   - The C1 interval-sweep and C2 segment-intersections lessons. `applyPointSetAction` `set-points` must pass `this.allowsIntervals()` or segments before a lesson loads such a scene. The C2 summary must not claim fewer tests: 9 neighbour tests vs 6 pairs.
   - Each lesson removes `lesson: false` and the id from `lessonCatalog.test.ts:186`, per the [one-shot lesson text](../../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31).
4. Then F5 media (posters for all six compgeo ids in `POSTER_PENDING`) and F6.

## Open risks

- Lesson card covers the point cluster at 1366×768 in A2 and A4 (handoff 14).
- Deferred from 13: focus to body after Remove; re-lettering after removal not announced; `orientation-predict` hides `turn` while text names line \(pq\); `checkAuthoredAction` uses global `isFinite`.
- SL prompt wording for the three new Demonstrations has not been read by a native speaker (texts in `sl.ts` at `prompt_compgeo_ear_clipping_*`, `prompt_compgeo_interval_sweep_*`, `prompt_compgeo_segment_intersections_*`).

## Lessons from this run

- F2b briefs must name `src/graphs/base/graphTransientStateContract.tsx` (`PRESET_DATA_STATE_KEYS`) among the enumerating tests; only the full suite caught it.
- Smoke workers cite screenshots they never opened; the handler viewing two shots found the clipped view. Ask the smoke worker to view every screenshot it reports.
- `just preview` refuses after any build-input edit, test files included: rebuild after the last fix, then serve.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`medium` for graphs, registration and lessons, `high` for exact kernels); reviews `bezeg-reviewer` Sonnet; first-sight smoke `bezeg-smoke` Sonnet, narrow rechecks Haiku.
