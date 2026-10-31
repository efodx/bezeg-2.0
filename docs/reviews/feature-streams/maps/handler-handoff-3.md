# Maps stream: handler handoff 3

Written 2026-10-31 by handler 3 (Opus 5.5, permission mode `auto`, effort `medium`) after its 150k soft threshold. The machine was critically low on memory near the end: Claude Code stopped two background commands (the handler's 215k watcher and an integrated focused test run).

## State

- Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps`, rebased on `origin/master`.
- **On `master` (accepted):** up to `dd31188`.
- **Not on `master` (unreviewed):** the two graph commits and this note, pushed to `origin/maps-graphs-wip`. `origin/worktree-stream-maps` is stale (pre-rebase). Do not force-push either branch.
- `node_modules` is a junction: delete the junction before removing the worktree.
- `Run state: active`.

## Accepted and on master

| Commit | Work | Verification |
| --- | --- | --- |
| `a0be812` | Linear 04: `scripts/linear-map-benchmark/` (`just linear-map-bench`), results in `docs/reviews/linear-maps/grid-drawing-measurement.md`, ADR (renumbered to **0032** in `dd31188`: master gained a probability ADR 0031) | Worker bench run (5 repeats × 4 configs). Handler: added the missing `tsconfig.json`, fixed a `ZoomOptions` type error, bench `tsc` and build pass. Device check is an open F6 item (task 07) |
| `c286d3b` | Complex 02 reciprocal/division/`nthRoots` kernel | Worker mutation evidence for 3 groups; handler math review (formula, ordering, branch cut); handler fix: no `as number` casts, `isOnUnitCircle` reuses `complexUnits` (now exported from `complexMobius.ts`) |
| `fa0cd38` | Complex 05 `sampleImage` kernel | Worker mutation evidence; handler review. Spec M3 stress figures corrected: midpoint-to-chord deviation is about the tolerance (0.005 gives 5.1e-3), so a 1e-3 drawing needs tolerance ~5e-4 |
| `5f57d89`, `dd31188` | Stream status, ADR renumbering | Docs |

Checks: the full unit suite passed (284 files, 5358 tests, 872 s) at `3f468cc` (pre-rebase equivalent of `5f57d89`, dirty with in-flight graph files). After the rebase: `npx tsc --noEmit` and the bench `tsc` clean, `just unit` on the complex and linear kernels passed at `6ed3d71` (clean).

## Implemented, unreviewed (on `origin/maps-graphs-wip`)

- `9481ee2` **Complex 03, reciprocal half:** `src/analysis/complexReciprocalModel.ts`, `src/graphs/complex/ComplexReciprocalGraph.tsx`, `complexReciprocalPresets.ts` (own Preset file; task 04 may move it), 54 keys after `complex_legend_arcs`, six terms in `docs/localization.md`. Worker: 38 focused tests pass (incl. unchanged complex multiplication tests), `tsc` and build pass, mutation evidence for every group (Reset not isolated). Gaps: no real-board host test. Lesson actions beyond z/w coordinates are left to task 04 (list in the worker note `docs/reviews/complex-maps/03a-worker-handoff.md` and the commit).
- `6ed3d71` **Linear 05:** `src/graphs/linear/` (graph, scene, Preset collection, unit and host tests), 53 keys before `invalid_function_data`, six terms. Adds a typed `linear-map` kind to the `LessonAction` union in `src/learning/model.ts` (handler decision: task 05 acceptance 4 needs registered actions; convention from `docs/specs/function-concepts.md` §typed lesson actions; `model.ts` imports types from `src/linear`). Platform A10 owns `model.ts` in its step 2: expect a rebase conflict there, additive only. Worker: focused tests, `tsc`, build pass; mutation evidence for all groups. Open: the lesson `mode` accepts all five modes while the graph offers two; the probe is fixed at (1, 1).
- Integrated check after both slices: `tsc` clean; the focused unit run over both graphs was **killed for memory and is unverified**.

## Next steps, in order

1. Rerun `just unit src/graphs/linear src/linear src/graphs/complex src/analysis/complexReciprocalModel src/learning`, `just check-localization` and `just build` on `maps-graphs-wip`.
2. Review both graph commits (AGENTS.md review routing): engineering (consumers, lifecycle and disposal, state after Reset and restore, vacuous assertions) and UI/accessibility, `bezeg-reviewer` Sonnet; mathematical review of the determinant readouts and statuses and of the reciprocal readouts. Repair, then push them to `master` as a fast-forward.
3. Complex 03, roots half (`ComplexRootsGraph`, `complexRootsModel.ts`), keys after the `complex_recip_*` block. Uses `nthRoots` (typed `zero`/`invalid-degree` results).
4. Everything else waits on `G-REG` (Platform step 2, A10) or `G-CG` (geometry stream convexity Batch 0). Both were closed at this handoff. When only gated work remains, set `Run state: waiting on G-REG, G-CG`, push, and end without polling.

## Open notes (low, not fixed)

- From handoff 2: `circleInversion` throws on a bad radius (the reciprocal graph guards it); inversion and Möbius images accept a point-circle source; the complex spec's integer-bound estimate is low.
- The complex 05 parabola tests do not respond to a tolerance-only mutation (65 minimum-depth samples are already accurate). Acceptable; group 3 is tolerance-sensitive.
- `sampleImage` swallows exceptions thrown by `f` and treats them as undefined.

## Risks and lessons

- **Memory pressure:** Claude Code stopped background commands while the session was idle. Do not chain unit, localization and build in one long background command; run them separately.
- A worker started a full `just unit` that held the machine-wide lock for over 30 minutes, blocking others, and stopping it was refused (workload interference). Briefs should say "do not run the full suite" (this handler's later briefs did).
- Shared localization files: give parallel workers disjoint anchors (one inserts after a line, the other before the next block). To commit them separately, stage a filtered blob with `git hash-object -w --stdin --path=<file>` (without `--path`, CRLF filters are skipped and the whole file appears changed).
- ADR numbers raced again (0031). Check `git ls-tree origin/master docs/adr/` right before pushing.
- Graph workers needed about two contexts each (both hit 135k). Split graph slices smaller, or brief a continuation from the start.

## Settings to keep

Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Workers: `bezeg-worker` Sonnet 5.5 `medium`; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` on port 4316. Watcher with retry: `for i in 1 2 3 4 5 6; do python tools/agent-usage/claude_worker_watch.py <id> --until 135000 && break; done`.
