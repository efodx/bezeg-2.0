# Geometry stream — handler handoff 5

Written 2026-10-31 by handler 5 (Opus 5.5, permission mode auto, effort medium) after its 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. Accepted work is on `master` up to `eb4ffc4`. The commit adding this note, and the one before it with the two unreviewed kernels, are pushed to `origin/stream-geometry-h5` only, not to `master`. Rebase them onto `origin/master` and push to `master` once the reviews accept them. `origin/stream-geometry` still holds an old WIP commit; leave it. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: active`. Families: [convexity](../../../tasks/convexity-hulls/README.md), [triangulation](../../../tasks/triangulation-voronoi/README.md), [sweep](../../../tasks/sweep-algorithms/README.md).
- Untracked files that are not ours to commit: `docs/reviews/convexity-hulls/0[578]-*.log`.

## Done this run

| Item | Commit (master) | Notes |
| --- | --- | --- |
| Convexity 10 accepted | 23c7e5c | Six repairs by a fresh worker. Haiku re-review of the shared `showsModeToggle` hook found one should-fix (a disposed controller was replaced while unmounted), fixed by the handler. Batch 1 F2a is complete. |
| Triangulation 02 `incircle` accepted | 00f17b4 | Math review found nothing. The worker's "spec contradiction" was the handler's own task-file wording, now corrected. The 06 task file is in the same commit. |
| Sweep F0 | eb4ffc4 | [ADR 0035](../../../adr/0035-sweep-coordinates-and-exact-event-order.md): grid ≤ 2^10, `RationalPoint` from ADR 0030's shared `rational.ts`, downward order, exact surd heights. Adds the task README and tasks 02–03, and marks the spec scheduled. C6 is not scheduled (owner decision). |
| Triangulation 03 structure, 06 ear clipping | branch only | Implemented, with handler checks passing. **Math reviews pending.** Each task file's status lists the points for its reviewer. |

## Remaining steps, in order

1. **Math reviews of 03 and 06**: two `bezeg-reviewer` Sonnet `medium` runs in parallel, each pointed at its task file's status (03: the hull-boundary check, the flip neighbour updates, and the untested `hull-edge-missing`/`area-mismatch`; 06: the ear rule, the `phase` event, colouring by dual walk). Then repair if needed, accept, update the task files, both READMEs and the stream line, and push to `master`.
2. **Triangulation 04** (Delaunay construction and Lawson trace; B3 examples, brute-force oracle): write the task file from spec B3 and the README decisions (incremental insertion in lexicographic order plus Lawson flips), check its numbers by script, then dispatch Sonnet `high` with a math review. Then write the 05 task file (Voronoi value, B4) after 04 is accepted.
3. **Sweep S0 02** waits for `src/compgeo/rational.ts` (triangle geometry task 01, maps stream). Check `master`. If the module is still missing and nothing else is runnable, note it on the maps stream file rather than writing a second rational type (ADR 0035, Consequences).
4. **Request from Curves** (in the [stream file](../../../tasks/feature-streams/geometry.md) notes, arrived on `master` during this run): A6's separating-axis hull-disjointness test must accept off-grid control points, with the robustness rule recorded in A6. Read convexity spec A6 and the curves AB-1d plan, decide the rule (for example a keep-biased overlap margin, labelled inexact under ADR 0021's "inexact for teaching only" boundary, or an ADR 0021 amendment), and write a task. This is a real decision with alternatives, so it may need an ADR amendment.
5. When only gated work remains (F2b and later wait for `G-REG`), set `Run state: waiting on G-REG`, push, write a note and end.

## Checks and revisions

- At `76730dc` plus the repairs and incircle (dirty): tsc 0, `just lint src/graphs/compgeo src/compgeo` pass, `just unit src/graphs/compgeo src/compgeo` pass, `just build` pass (warnings). After the handler's lifecycle fix: tsc, lint and `just unit src/graphs/compgeo/HullTraceGraph` pass. After the rebase onto `6340ac2`: tsc 0. With 03 and 06 added: tsc 0, `just lint src/compgeo` pass, `just unit src/compgeo` pass. The full suite was not run; hosted CI covers `master`.
- Workers this run: 4 implementers (1 repair), 2 reviewers. Records are in `docs/agent-workflow/evaluation-log.md`.

## Lessons

- When a task file restates spec numbers, quote the spec's sentence. A paraphrase ("three other tests") produced a false contradiction report.
- In-place controller swaps need the disposed/unmounted state checked. The Haiku single-concern review caught this cheaply.
- Sweep tests that sort the whole status "just below" an event are invalid when several events share a height. Task 03's wording explains why.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet `medium` (`high` for robust predicates, structures and Delaunay). Reviewers `bezeg-reviewer` Sonnet `medium` for mathematics, Haiku for single-concern slices. At most two implementation workers at once. Brief revision `handoff-v12`. Start each worker's watcher (`--until 135000`, Haiku 78000). Tell workers: no full suite or build, and bound loops before mutating.

## Open decisions and risks

- None needing the owner now. The A6 off-grid rule (step 4) may become an ADR 0021 amendment.
- Deferred, low: `polygonSimplicity` has no brute-force reference. 10's slow-test step count was not logged exactly (about 27 s at 50 ms). 10's new copy has not been seen in a browser (F2b smoke). 06's random tests check invariants, not clip order.
