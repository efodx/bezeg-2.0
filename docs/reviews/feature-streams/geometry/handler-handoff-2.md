# Geometry stream — handler handoff 2

Written 2026-10-31 by handler 2 (Opus 5.5, permission mode auto, effort medium) at its 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`, rebased onto `origin/master`; everything committed is on `master` (last: the commit adding this note). `origin/stream-geometry` still holds the old WIP commit: updating it would need a force-push, so leave it. `node_modules` is a junction to the main checkout (delete the junction itself before removing the worktree).
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: active`. Family tasks: [docs/tasks/convexity-hulls/](../../../tasks/convexity-hulls/README.md).

## Done this run

| Item | Commits on master | Notes |
| --- | --- | --- |
| Task 05 point-set graph accepted | 74efb80 (WIP), 8a77382, 5d87af2 | Fresh worker fixed the grid helper-object leak and the aria-label restore. Engineering + UI/a11y reviews (Sonnet), five repairs confirmed by the handler with observed pre-fix failures. Handler fixed a lint error (`set-state-in-effect`) found by `just check` |
| Architecture | eaa0c3e | `docs/current-architecture.md` names `src/compgeo/` and the point-set graph |
| Task 06 partial | d953125 | [batch0-acceptance.md](../../convexity-hulls/batch0-acceptance.md) |
| Spec correction | this commit | A4 gift wrapping makes 35 orientation tests (5 wraps × 7), not 40; the spec counted the candidate against itself |

## Remaining steps, in order

1. **Open `G-CG`.** `just check` at 3578b97 failed only on `src/graphs/base/presets/PresetCatalog.test.tsx` (two tests get an extra `curve-curvature` key: the curves stream's curvature graph). Curves handler 6 was messaged and asked to send the fixing commit. When it lands (or `git log origin/master -- src/graphs/base/presets/PresetCatalog.test.tsx` shows a fix), run `just unit src/graphs/base/presets/PresetCatalog.test.tsx --maxWorkers=1`, then `just check` once at a stable checkpoint. If green: record the revision in batch0-acceptance.md (state: accepted), mark task 06 accepted in its file and the README, set `G-CG` to `open` and the family status in geometry.md, push, and confirm hosted CI (`gh run list --branch master`). If it stays red for a curves reason, do not open the gate; ask the owner whether to open `G-CG` with the documented exception.
2. **Batch 1 task files** (ungated F1 and F2a; F2b/F3–F5 wait for `G-REG`, still closed on 2026-10-31 in platform.md). Proposed, linked to spec A1, A2, A4 and the batch-wide gate:
   - 07 F1 area and lattice kernel: exact doubled signed area (shoelace), boundary count by edge gcds, interior count computed independently of \(B\) and Pick (lattice points strictly inside, by exact point-in-polygon on the bounding box), simple-polygon requirement surfaced (self-intersecting: "signed sum of winding number times area", Pick not offered). Mathematical review.
   - 08 F1 slow edge test and gift wrapping traces on the trace model (`src/compgeo/trace.ts`, shape of `monotoneChain.ts`), with `predicateCount`, same vertex set as the chain on sample 1 and all-collinear input, \(n<3\) results. Mathematical review.
   - 09 F2a A1/A2 overlays as `PointSetGraph` subclasses (turn text + value readout, signed area/fan/\(I\),\(B\) readout), A1 acceptance 4 over a small grid.
   - 10 F2a A4 hull trace graph: overlays and step controls (Next step, Play stopped by default, Reset to step 0, edits recompute and pause; Next and Play give identical states). Locate an existing playback pattern with search first.
   Numbers verified by an independent script (handler 2): A2 hull pentagon doubled area 42 (area 21), \(B=8\), \(I=18\); notched pentagon 36 (18), \(B=16\), \(I=11\); A4 slow test 72 pairs, 504 tests, 5 directed edges; gift wrapping 5 wraps, 35 tests, hull \((-1,3),(0,0),(4,0),(5,3),(2,5)\). Monotone chain pops are already tested in task 03.
3. Then F0 for triangulation (T0 kernel incl. `incircle`, Sonnet `high` because robust predicates) and sweep (S0, rational ADR). When only gated work remains, set `Run state: waiting on G-REG`, push, write a note, and end.

## Checks and revisions

- 8a77382/5d87af2 (task 05 on master): compgeo unit tests, tsc, lint, production build pass. `just check` at 3578b97: typecheck and lint pass, 5727/5729 unit tests (only the curves failure above); build step skipped by the failure, passed separately at 5c836a2.
- Hosted CI run for 8a77382 was cancelled by a later push; later master runs were green at bb216ad (docs-only). Check CI for d953125 or later.

## Lessons for this stream

- Run `just lint <path>` in every worker brief: tsc and unit tests passed while lint failed.
- `master` moves every few minutes. Fetch, rebase, tsc and push with no other steps in between; run the build after. The single test slot is often busy (builds wait 10+ minutes).
- Do not use `git rebase --autostash` (it uses the shared stash stack); commit first.
- The machine reaps background commands under memory pressure; if a watcher or build is reaped, report it and restart only when the owner agrees (the owner agreed once in this run).

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet `medium` (`high` for robust predicates or incircle, recorded), reviewers `bezeg-reviewer` Sonnet `medium`, Haiku for routine single-concern slices. At most two implementation workers. Brief revision `handoff-v12`. Start each worker's budget watcher (`--until 135000`). Path-filtered `just unit <path> --maxWorkers=2`.

## Open decisions and risks

- None needing the owner unless step 1 stays blocked.
- Deferred, low: `polygonSimplicity` has no brute-force reference; upper-chain pops only via the hull oracle; the scene-change test assumes two board objects per point.
- Evaluation records (`subagent-flow-evaluation` do-log) for Batch 0 workers are not written yet; write one record for the family at Batch 0 acceptance.
