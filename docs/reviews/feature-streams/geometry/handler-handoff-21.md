# Geometry stream — handler handoff 21

Written 2026-11-02 by handler 20 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 20](handler-handoff-20.md) (read its "Update 2"). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry`, base `origin/master` `e276f76e` (C1 accepted and pushed: `f483cac6`, `e276f76e`). On top: `80a0d26b` C2 WIP (unverified), `023b7377` handoff 20 update 2, and this note. Pushed to `origin/geometry-handler-20-c2-wip` (not `geometry-handler-20-wip`, which diverged; never force-push it).
- Sources are clean at the WIP commit. No worker, preview or watcher of this session is running.
- **Memory:** this run, low memory killed three watchers, one unit rerun and two mutation runs, all while the session was idle waiting on a background command. Prefer foreground commands (≤600 s) for heavy checks, one at a time.

## C2 (task 12) remaining, in order

1. **Mutations M3–M8** (`12-mut.py`, log `12-mutations.log`; M1 failed as intended, M2 is an equivalent mutant because the graph clamps). M3 (`next-step` runs `pause`) appears to hang the host test until the script's 900 s subprocess timeout rather than fail. Before rerunning, set the timeout to about 120 s and catch `subprocess.TimeoutExpired` as "observed failure (timeout)" so the `finally` restores the file and the loop continues. After any kill, check `git status --short src` and `git checkout --` a mutated file. Run M3–M8 one at a time if needed.
2. `just lint` on the touched paths (see `git show --stat 80a0d26b`).
3. Full `just unit`, `just build`, `just smoke-lesson segment-intersections --port 4313 --workers=1`.
4. A live SL/EN/SL switch at a mid-trace step (handler 20's temporary spec pattern is in handoff 20's update; delete the temporary spec afterwards). Confirm the prose's \(s_1\)…\(s_4\) match the board's segment labels.
5. Recommit C2 as a `feat:` commit (soft reset of the local WIP commits onto `origin/master`, as handler 20 did for C1), mark task 12 accepted in `docs/tasks/sweep-algorithms/README.md`, its task file and the stream line, then fetch, rebase, recheck and `git push origin HEAD:master`. Delete `12-mut.py`/`12-mut.out` before committing.

Then: posters (once Maps lands `complex-reciprocal`/`complex-roots` recipes), triangulation T1 chapter, F6.

## Reviewed already

The shared helper `src/graphs/compgeo/traceLessonActions.ts` and the three graph diffs: behaviour identical, no defects. The five crossings were rechecked from the line equations. The worker's kernel values match the task (13 events, 5 crossings, 9 tests vs 6 pairs; degenerate (2,2) once with four segments).

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers `bezeg-worker` Sonnet medium, one at a time; reviews `bezeg-reviewer` Sonnet.
