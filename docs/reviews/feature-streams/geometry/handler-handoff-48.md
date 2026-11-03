# Geometry stream: handler handoff 48

Written 2026-11-03 by handler 48 (Opus 5.5, auto, effort medium). Continues [handoff 47](handler-handoff-47.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher passed the 175k soft threshold while two graph workers were running; both returned partial at their 135k budgets.

## Done this run

1. **S3 F6 accepted.** The `fortune` poster was recaptured after C-7: the ring sits on D, the false-alarm circle is crossed, and the circles are round ([record](f6-s3-acceptance.md), [log](48-capture.log)).
   - The selective run failed the exhaustive route check on Curves' new `bspline-nurbs`, so `bspline-nurbs` was captured jointly and `POSTER_PENDING` was emptied.
   - The NURBS recipe window became `[-2.37, 1.45, 2.37, -1.45]`. The old window's aspect made the circle an ellipse. There is a note to Curves in the stream file.
   - Commits `94076b31` and `72d3cc96`. Hosted CI was green on `8d26fb1b` (run 41675027582), which contains them; the earlier runs were cancelled as superseded.
2. **Index fix.** The triangulation-voronoi README rows for 23 and 24b now say accepted, as their task files did.
3. **Convexity Batch 2 planned** as tasks 16–23 ([README](../../../tasks/convexity-hulls/README.md#batch-2-a3-a5)).
   - Decision: the A5 "free double" board is a fixed Kettner sign map, because ADR 0021 already rules out free double points feeding an algorithm.
4. **Task 16 accepted:** point-in-polygon kernel (handler math review).
5. **Task 17 accepted:** monotone chain `pop`/`duplicates` options and `kettnerSignMap()`.
   - The worker's corrections are recorded in 17's status. Under `<`, sample 1 keeps \((2,0)\). \((2,5)\) stays on the hull under every rule. Duplicates and collinear points end up on both chains.
   - Tasks 19 and 22 were corrected to match.
6. **Pushed to master:** `86ba55f3`, `c3364590`, `f01f3cea` (16) and `f1b2afcf` (17), plus this note. Gate checks at `f1b2afcf` after the rebase: tsc 0, and `just unit src/compgeo src/graphs/compgeo/HullTraceGraph.host.test.tsx src/demonstrationPreviewAssets.test.ts` passed. Logs are in `docs/reviews/convexity-hulls/48-push-*.log`.

## Branch state

- `master` = `f1b2afcf` + this note.
- Local `stream-geometry` = master + one WIP commit: tasks 18 and 19, **unverified**. The WIP is also pushed as `origin/geometry-batch2-wip`. Never push the WIP to master as is.

## Next steps, exactly

1. Confirm hosted CI for this note's push (`gh run list --branch master`). Other streams push often, so a cancelled run is superseded; look for the first completed run containing this note.
2. **Finish task 18** from [18-handoff.md](../../convexity-hulls/18-handoff.md), with one fresh `bezeg-worker` (Sonnet, high):
   - run and fix the host test `PointInPolygonGraph.host.test.tsx` (the shim support it doubts is listed in the note);
   - run lint, the full `src/graphs/compgeo src/compgeo` unit run, the build, two mutations, and the language-switch and scene-change checks.

   The worker did not add `ray`/`winding` to `POINT_SET_OVERLAY_NAMES` (`src/compgeo/pointSetModel.ts:28`). `set-query-point` is documented "VoronoiGraph only" (`src/learning/model.ts:287`). Task 21 extends both. Handler review, then commit 18 on its own.
3. **Finish task 19** from [19-handoff.md](../../convexity-hulls/19-handoff.md), with a second worker:
   - compile first (a suspect JXG import and a `!` assertion);
   - write the readout unit test and the host test;
   - confirm that `HullTraceGraph`'s existing tests pass after its small refactor (`hullActions` is protected, there is a new `hullControls()`, and `runHullTrace` takes chain options);
   - do the mutations.

   The Kettner view is one panel with an inexact/exact toggle (3 board objects, SVG data-URL image). The 100 ms timing may move to task 20. The Preset collection is still inherited, and task 20 adds `compgeo-hull-robustness`. Review it as a large diff (engineering + UI/accessibility), because it changes shared hull-trace files.
4. Split each brief to finish within about 30 turns. Both graph workers hit 135k at 45–47 turns before running tests, so ask for the host test to run early.
5. Then tasks 20 (registration and posters, `POSTER_PENDING` union), 21, 22, 23, F5 and F6, as in the README.
6. **Worktree cleanup still needs the owner.** Ask before acting. The lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Delete `origin/geometry-batch2-wip` once 18 and 19 are on master.

## Risks and lessons

- The capture's exhaustive route check makes a selective capture include every pending id. Empty `POSTER_PENDING` and rebuild before capturing.
- A recipe window whose aspect differs from 720×440 distorts circles unless the id is on the capture's equal-units list. Task 20 says so.
- The local capture tooling suite fails one test, the FFmpeg 9.0.2 VP9 `bt709` check. It is a known environment gap.

## Live processes

The 215k self-watcher, which ends with this session. No preview is running, and all workers have returned.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, effort high), at most two at once, each with a 135k watcher.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 50" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
