# Geometry stream — handler handoff 10

Written 2026-11-01 by handler 10 (Opus 5.5, permission mode auto, effort medium), relaunched by the supervisor after handler 9's successor crashed. Written at the 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- `Run state: active` on `master`.
- Untracked `docs/reviews/convexity-hulls/0[578]-*.log` and `12-unit-*.log` are not ours to commit.
- The branch was moved to `origin/master` with `git reset --mixed` after task 12 was pushed from a temporary worktree, so no WIP commits remain. Its uncommitted working tree holds slices in progress: see the end of this note.

## Done this run (all on `master`)

| Item | Commit | Notes |
| --- | --- | --- |
| Convexity 12 F2b registration | `0af5594b` | Handler 9's WIP plus a crashed successor's reconcile commit, folded into one commit. Full unit run: 6693 tests, with one failure fixed afterwards (`DemonstrationsPage.test.tsx` had a hard-coded poster exemption); lint, tsc and build clean. Haiku smoke passed: the three routes in SL and EN, live switch, Preset save/restore, catalogue entries. **Posters deferred to F5:** `capture-demonstration-previews.cjs` requires a recipe for every shipped id, and Maps' `linear-map` has none, so no capture can run. The three ids are in `POSTER_PENDING` (`src/demonstrationPreviewAssets.test.ts`) and in the `DemonstrationsPage.test.tsx` exemption; their recipes are already in the recipes file. |
| Sweep task 04 file | `39705715` | [04 segment-set mode](../../../tasks/sweep-algorithms/04-segment-set-mode.md). Decision: segments are a third `PointSetMode`. |
| Triangulation 05 Voronoi value | `6983a42b` | Sonnet `high` worker; Sonnet math review found no correctness issues, and its three test gaps were closed. 23/23 tests; mutations failed 2 and 4 tests. |

## In the working tree, not committed

1. **Sweep 04 (segment-set mode):** implemented by a Sonnet `medium` worker. Unit, lint, tsc and build passed, and every assertion group showed mutation evidence. Sonnet engineering + UI/a11y review found no blockers. I sent the worker repairs: the notice kind on the segments switch over the limit, a dead unmount assertion, and a comment at `allowsSegments()`. The handler changed one Slovenian string (`pointset_invalid_odd_segment_endpoints`: "v načinu daljic"). Deferred finding: focus falls to body after "Remove segment" (the existing point list behaves the same way). Files: `src/compgeo/pointSetModel.ts`/`.test.ts`, `src/graphs/compgeo/PointSetGraph.tsx`, `PointSetControls.tsx`, `pointSetPresetCollection.ts`, `PointSetSegments.host.test.tsx`, and 14 `pointset_*` keys in `sl.ts`/`en.ts` after `pointset_area_markers_skipped`.
2. **Triangulation 07 (ear-clipping graph):** [task](../../../tasks/triangulation-voronoi/07-ear-clipping-graph.md) (uncommitted, linked from the triangulation README, also uncommitted). A Sonnet `medium` worker was running it at handoff in the same worktree: new `EarClipping*` files under `src/graphs/compgeo/` and its own key block after the hull-trace keys.

## Status at handoff

- **Sweep 04 accepted and pushed** (`6d1d4f9e`), after the repairs. Its locale hunks were split from 07's with a filtered patch.
- **Triangulation 07 is partial**, held as a local WIP commit on `stream-geometry` (not on master or the remote; the successor runs in this worktree). The worker stopped at its budget. Its note is [07-worker-handoff.md](../../triangulation-voronoi/07-worker-handoff.md), and its mutation script `07-mut.py` (restores the files after each mutation) sits beside it. Done: `EarClippingGraph.tsx`, `EarClippingControls.tsx`, `earClippingRun.ts`, `earClippingPresetCollection.ts`, and host tests (15/15 pass); 36 `earclip_*` keys after `hulltrace_note_accept_wrap`. Still to do: mutations M2–M11 (only M1 was run; it failed 2 tests), `just lint`, `just build`, `just unit src/graphs/compgeo --maxWorkers=2` (hull tests unverified), and tsc after the final test edits. Then an engineering + UI/a11y review and a check of the Slovenian copy. Open item: the base "closed polygon" checkbox stays visible but is forced back to closed. Hide it with a protected hook in `PointSetControls`, a small shared-graph change this stream owns.
- **Maps stream stopped** on a rebase conflict (`3e650b52`), so a `linear-map` poster recipe will not come soon. For convexity F5, consider teaching `capture-demonstration-previews.cjs` to skip `POSTER_PENDING` ids; it is a shared script, so record that in the stream file first.

## Next, in order

1. Finish triangulation 07 from its WIP commit (status above): use a fresh worker with the worker note, then review and push. Squash the WIP into the accepted commit, building it in a detached worktree as described under Environment. For each slice: diff against the task, `just unit src/compgeo/pointSetModel src/graphs/compgeo --maxWorkers=2`, tsc, lint, build. Then push it and update the triangulation README and the stream file.
2. Triangulation 07 still needs an engineering + UI/accessibility review if it has not had one.
3. Convexity 13 (F3, A1+A2 lessons; the task file exists) touches `PointSetGraph.tsx` (`registerLessonActions`) and the locales. It can run beside 07 if each worker edits only its own locale block. Then 14, F4 chapter, F5 media (posters need a `linear-map` recipe from Maps, or pending-id support in the capture script; record the request in the stream file), F6.
4. Sweep S1 task files (C1 interval mode, C2 Bentley–Ottmann kernel) can be written now that 03 and 04 exist.

## Environment

- Memory was about 5.5 GB free at start. A full unit run took about 9 minutes; `just build` waited 285 s for a slot.
- Pushing while the branch carries uncommitted worker edits: build the commit in a detached worktree at `origin/master` under `$CLAUDE_JOB_DIR/tmp` (check out files from the branch), push, remove it, then `git reset --mixed origin/master` on the stream branch. That changes no working-tree file.
- The production preview on 4313 that this session started (`just preview 4313`) may still be running.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet (`high` for exact predicates, `medium` for graphs); math and engineering review `bezeg-reviewer` Sonnet; narrow smoke `bezeg-smoke` Haiku.
