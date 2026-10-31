# Geometry stream — handler handoff 1

Written 2026-10-31 by handler 1 (Opus 5.5, permission mode auto, effort medium) after its 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `node_modules` is a **junction** to the main checkout (delete the junction itself before removing the worktree; see the memory note on worktree junctions).
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: active`. Family tasks: [docs/tasks/convexity-hulls/](../../../tasks/convexity-hulls/README.md), which records the F0 decisions (ADR 0021 option A, `src/compgeo/`, `algorithm-trace` id, *Računska geometrija* family, terms as proposed).
- On master: run state (adcac74), F0 + ADR 0021 + `src/compgeo/grid.ts` (b0507e5), task 02 predicates, task 04 point-set model, statuses (6cb9976), task 03 trace model (28fc0e7).

## Batch 0 status

| Task | State |
| --- | --- |
| 01 F0 | done |
| 02 predicates | accepted, on master (math review: no findings; deferral in task file) |
| 03 trace model + monotone chain | accepted, on master (math review: no findings; deferral in task file) |
| 04 point-set model | accepted, on master (handler fix: huge integers reported as out of range) |
| 05 point-set graph | **partial**. The worker hit its budget at 46 turns. Its work is in a WIP commit on branch `stream-geometry`, pushed to `origin/stream-geometry`, **not** master. Worker note: [05-worker-handoff.md](../../convexity-hulls/05-worker-handoff.md) |
| 06 Batch 0 acceptance | not started |

## Task 05 state (from the worker)

- Files: `src/graphs/compgeo/PointSetGraph.tsx`, `PointSetControls.tsx`, `pointSetPresetCollection.ts`, `PointSetGraph.host.test.tsx`, `pointSetPresetCollection.test.ts`; 40 `pointset_*` keys in `sl.ts`/`en.ts` before `invalid_patch_data`. Interface: the `PointSetGraph.tsx` module comment. Overlay hook: protected `overlayIds`/`overlayLabel`/`drawOverlay`, `state.overlays`.
- `just unit src/graphs/compgeo --maxWorkers=2`: 26 of 28 pass. Failures: (1) one `grid` board element remains after the grid overlay is switched off (test near line 244, likely a grid child not removed); (2) after unmount the container keeps its `aria-label` (test near line 269; `bindInteraction` restore under StrictMode). Treat both as real disposal defects.
- Not yet run: tsc after the tests were added, the production build, mutation evidence. The preset key `compgeo-point-set` is not in `PresetImport.ts`; that belongs to F2b unless import cannot be tested without it.

## Remaining steps, in order

1. Finish 05 with a **fresh** Sonnet `bezeg-worker` (medium) from the worker note: fix the two failures, add two mutation observations, tsc, production build. Then engineering + UI/accessibility review (Sonnet `bezeg-reviewer`). Commit the fixes on top of the WIP commit (do not rewrite history); push to master once accepted.
2. Task 06: `just check` once at a stable checkpoint (the full unit suite has not run for Batch 0 yet); write `docs/reviews/convexity-hulls/batch0-acceptance.md`; name `src/compgeo/` and the point-set graph in `docs/current-architecture.md` (*Mathematical implementation and adapters*); set `G-CG` to `open` in geometry.md; push; confirm hosted CI.
3. Then ungated work while `G-REG` is closed (check `docs/tasks/feature-streams/platform.md` on origin/master): Batch 1 task files (A1/A2/A4 kernels: signed area, lattice counts and Pick, slow edge test and gift wrapping traces), then F0 for triangulation (T0 kernel incl. `incircle`, Sonnet `high`) and sweep (S0, rational ADR). When only gated work remains, set `Run state: waiting on G-REG`, push, write a note, and end.

## Machine and test load

- The machine was overloaded on 2026-10-31 (a peer session reported 0.3 GB free). Master has a6cd11a (1 test slot of 4 workers here; a second identical heavy command in one checkout is refused). Workers run only path-filtered `just unit <path> --maxWorkers=2`; the handler runs the full suite at task 06. Killing processes by pid is denied by the auto-mode classifier; stopping a worker with `TaskStop` ends its background runs.
- PowerShell `Set-Content -Encoding utf8` adds a BOM; use Python or the Edit tool for edits.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet `medium` (raise to `high` for robust predicates or incircle and record why), reviewers `bezeg-reviewer` Sonnet `medium` for math and engineering, Haiku for routine single-concern slices. At most two implementation workers at once. Brief revision `handoff-v12`. Start each worker's budget watcher (`--until 135000`) and send `HANDOFF` when it exits at the threshold.

## Open decisions and risks

- None needing the owner. The family placement (*Računska geometrija*) is a reversible handler decision applied at F2b.
- Deferred, low risk: `polygonSimplicity` has no brute-force reference test; upper-chain pops are covered only through the hull oracle.
