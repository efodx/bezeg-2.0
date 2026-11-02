# Geometry stream: handler handoff 28

Written 2026-11-02 by handler 28 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 27](handler-handoff-27.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- **Branch:** `stream-geometry`. `master` is at `8ae72bfd` (task 13 accepted). One local commit is not on master: `7c59e7ff` (task 14 registration, verified but not accepted). It is also pushed to `origin/geometry-t2-14-wip`.
- **Old remote branch:** the remote branch `origin/stream-geometry` (`0627de12`) is an old line that is neither an ancestor of master nor of this branch. It was left untouched; do not force-push it.
- **Running processes:** no worker, preview or watcher from this session is running.
- **Done this run:**
  - **T2 task 13 accepted:**
    - Commits: `7a152108` 13a, `f6406d87` 13b, `63282bd0` review repairs, `8ae72bfd` acceptance docs.
    - What it adds: `DelaunayGraph`, `DelaunayControls`, `delaunayRun.ts` and `delaunayPresetCollection.ts` (key `compgeo-delaunay`).
    - Evidence and gaps are at the end of the [task file](../../../tasks/triangulation-voronoi/13-delaunay-graph.md). The evaluation-log entry is written.
  - **Task 14 items 1–4 and 6** (`7c59e7ff`):
    - Routes `/compgeo/point-set-triangulation` and `/compgeo/delaunay` are registered with `lesson: false`.
    - Both ids are in `POSTER_PENDING`, which now lives in `src/demonstrationPosterPending.ts`.
    - Handler decision: the Preset key stays `compgeo-triangulation`, as accepted in task 12; the task table row is corrected. No route existed before, so no stored data depends on the key.
    - `DelaunayGraph` inherits the triangulation view `[-2.5, 9.5, 10.5, -1.5]`, so its default quad (0..5 × 0..3) looks small. Judge this in the smoke; fit it with an `initialView()` override if it is too small for projection.

## Remaining, in order

1. **Finish task 14:**
   - Rebase `7c59e7ff` onto `origin/master`.
   - Run the full unit suite once. The worker ran it before its last fixes (3 failures in its own enumerating lists), then reran only the affected files.
   - Run `just build`, then `just preview 4313` (check the argument form in `scripts/commands.cjs`).
   - Dispatch one Sonnet `bezeg-smoke` with `.agents/skills/smoke-tester/SKILL.md` and `docs/smoke-tests.md`. It covers the task's handler smoke (both routes: load, reload, catalog, Next/Play/Reset on `delaunay`, flip on `point-set-triangulation`, live SL/EN switch, Preset round trip, 390 px) and the gaps carried from tasks 12 and 13:
     - a real board click on a Delaunay triangle (a transparent polygon with `hasInnerPoints`, under the edge curves) and on an edge;
     - keyboard Enter and Space on the triangle list;
     - Play timing;
     - live SL/EN board text;
     - the default-view size.
   - **The browser drag measurement at 40 points:** use a Playwright production preview, drag one point on `point-set-triangulation` with 40 points through about 40 moves, and record the time from each move to the next frame (median, max), with and without both overlays. Record it per the [performance plan](../../../performance-plan.md) protocol (commit, browser, viewport). Earlier jsdom numbers: about 1 ms for the state write, 75–84 ms for a redraw (141 ms with overlays), about 37 ms of it creating about 76 edge curves. Decide on batching the curves only from the browser numbers.
   - Then record acceptance and push to master.
2. **Posters for the two new routes:** recipes plus capture, as handler 23 did ([posters brief](posters-brief.md)). Then empty their `POSTER_PENDING` entries.
3. **Tasks 15–17:** one code worker at a time. **S2 kernel 14** (sweep) may interleave.
4. **Stream lines:** keep them current. Family 2 now says 13 accepted. Convexity F5 media is still pending (posters wait on a Maps `linear-map` recipe).

## Checks run this run

- **Task 13:** tsc, lint on the touched files, `just unit src/graphs/compgeo --maxWorkers=2`, `just unit src/localization` and `just build` at 13a, 13b and the repair. After the rebase onto master (`b1ce2833`, then `8ae72bfd`), tsc and the compgeo unit run were repeated; localization and the build ran at `b1ce2833`. Logs are `docs/reviews/triangulation-voronoi/13*-*.log` (untracked).
- **Task 14:** tsc, lint, the full unit suite (before the fixes) and the build, plus a rebuild at `7c59e7ff` that passed. Logs are `docs/reviews/triangulation-voronoi/14-*.log`.
- **Hosted CI:** run `41409986502`, which includes task 12, passed. The CI for `8ae72bfd` was not checked; run `gh run list --branch master -L 3`.

## Risks

- **Memory:** it is tight; run heavy checks one at a time.
- **LaTeX in docs:** write it with the Write or Edit tool. A Python heredoc turned `\t` into a tab this run.
- **Never stage:** `src/demonstrationMotionAssets.ts`, smoke screenshots or JSON, or the untracked logs.
- **Shared point-set interface:** the Maps stream extended `POINT_SET_OVERLAY_NAMES` in `src/compgeo/pointSetModel.ts` (additive, at `3241d59b`) without a request in the stream file. It is harmless, but this stream owns that interface.

## Settings to keep

- Handler: Opus, permission mode auto, effort medium.
- Workers: `bezeg-worker`, Sonnet medium, one code worker at a time. Size the first slice of an L task smaller: 13a ran out at four items plus controls.
- Reviews: `bezeg-reviewer`, Sonnet for engineering and mathematics, Haiku for routine UI slices.
- Smoke: `bezeg-smoke`, Sonnet for broad runs and Haiku for narrow rechecks.
