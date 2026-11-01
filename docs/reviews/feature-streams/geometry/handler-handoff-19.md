# Geometry stream — handler handoff 19

Written 2026-11-01 by handler 19 (Opus 5.5, permission mode auto, effort medium). It continued [handoff 18](handler-handoff-18.md). It stopped at the 150k soft threshold. Claude Code then stopped the full unit run and the handoff watcher because the machine was critically low on memory, so no successor was launched. Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`, HEAD `acd81d21` (plus this note, uncommitted).
- `origin/master` = `b97a330a` (this run's two accepted commits). `acd81d21` is **unverified WIP**, pushed only to `origin/geometry-handler-19-wip`. `origin/stream-geometry` is an older diverged branch; do not force-push it.
- `node_modules` is a junction to the main checkout. No worker, preview or watcher is running.
- **Memory:** heavy runs get killed. Run one at a time and nothing else in parallel.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Poster recipes `ear-clipping`, `interval-sweep`, `segment-intersections` | `23ac3f44` (on master) | Each recipe was run against a production preview with Playwright, with no page errors. Ear clipping runs 11 clicks to the end of its 12 states (three triangles). Interval sweep is at step 5 (sweep at \(x=2\), first overlap). Bentley–Ottmann is at step 25 of 47 (sweep at \(y=2\)). The capture's board-ready wait also accepts `segment`/`point` (three compgeo boards have no curve/line before their first step); stroke scaling was left alone so existing posters keep their presentation fingerprint. `validateRecipes` now fails only for Maps' `complex-reciprocal`, `complex-roots`; note to Maps in the stream file. |
| Tasks sweep 11 (C1) and 12 (C2) | `b97a330a` (on master) | Decisions: `set-points` widens to `segments`/`intervals`, gated by the graph's modes; sweep graphs adopt `set-trace-step` and `algorithm-trace`; C2 says 9 neighbour tests vs 6 pairs honestly. |
| C1 lesson (sweep 11) | `acd81d21` WIP | Worker Sonnet medium (handed off at 135k, turn 63). Note: [11-worker-handoff.md](11-worker-handoff.md) (untracked). Worker checks: tsc clean, lint passed, new `IntervalSweepLessonActions.host.test.tsx` (11 tests), mutations M1–M7 each failed (`11-mutations.log`). Pinned: 26 steps; step 7 open 3; step 21 pairs ab, ac, bc, bd, de; end max 3 on [3, 4], 5 of 10; sample 2 21 steps, 4 of 6. Trace matches the spec. Handler review of `model.ts`, `lessonCatalog.ts`, `PointSetGraph.tsx`, `IntervalSweepGraph.tsx`: no defects; `set-trace-step`/`algorithm-trace` code is copied from `EarClippingGraph` (follow-up: share it when C2 adds a third copy). Lesson prose not reviewed (one-shot rule). |

## CI on master (run 41306083419, `18bf042f`)

Render rows and the Learn chapter row are now green. Still red: **unit** `familyChapters.test.ts` and `LearningPage.test.tsx` (Curves `2a6e9c4c`, not ours; do not edit their entries), and **smoke** catalogue cards, preview mapping and motion poster rows (posters pending, capture blocked on the two Maps recipes). Check whether Curves or Maps fixed them before acting.

## Next, in order

1. **Verify C1** on `acd81d21`: `just unit src/learning/content/compgeoGuidedLessons.test.ts` (the worker fixed it but did not rerun it), then full `just unit` (expect only the two Curves failures), `just build`, `just smoke-lesson interval-sweep`, and both languages with a live switch. Then fetch, rebase onto `origin/master`, recheck, and push to master; mark task 11 accepted in the sweep README and the stream line.
2. **C2** (task 12) with one worker; it adds the third copy of the trace-step code, so share it there.
3. **Posters** once Maps lands its two recipes (or capture all pending ids together); clear `POSTER_PENDING` and the `DemonstrationsPage.test.tsx` exemption.
4. Triangulation T1 chapter; then F6.

## Open risks

As in handoff 18 (card covering points at 1366×768, deferred a11y items, native-speaker SL review). `convex-hull`'s default view clips P5 at 1280×720.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one at a time. Reviews: `bezeg-reviewer` Sonnet.
