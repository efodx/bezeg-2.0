# Geometry stream — handler handoff 6

Written 2026-10-31 by handler 6 (Opus 5.5, permission mode auto, effort medium) after its 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`. Accepted work is on `master` up to `536926b`. The commit with the two unreviewed kernels (`7a07016`) and the commit adding this note are on `origin/stream-geometry-h6` only. Rebase them onto `origin/master` and push to `master` once the reviews accept them. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: active`. Families: [convexity](../../../tasks/convexity-hulls/README.md), [triangulation](../../../tasks/triangulation-voronoi/README.md), [sweep](../../../tasks/sweep-algorithms/README.md).
- Untracked files that are not ours to commit: `docs/reviews/convexity-hulls/0[578]-*.log`.

## Done this run

| Item | Commit (master) | Notes |
| --- | --- | --- |
| Triangulation 03 accepted | 3a46d5b | Math review found nothing. It proved `hull-edge-missing` and `area-mismatch` unreachable, so they are commented as defensive checks. |
| Triangulation 06 accepted | 3a46d5b | Math review: no must-fix. The handler repaired the tests: a clip-order reference (wrong-start mutation observed failing), an attempt bound instead of the clock, exact `stateAt` assertions, and `zero-area` documented as unreachable. |
| Curves request answered | 536926b | [ADR 0036](../../../adr/0036-conservative-hull-separation-for-off-grid-bezier-pieces.md) amends ADR 0021 for one function, `hullsSeparated`. The rule is recorded in spec A6 and the answer in the stream file. Convexity [task 11](../../../tasks/convexity-hulls/11-hull-separation.md). |
| Triangulation [task 04](../../../tasks/triangulation-voronoi/04-delaunay-lawson.md) written | 536926b | B3 numbers checked by script. A "continue after flip" variant gives example 2's same three flips, so the task requires a flip-order reference. |
| Maps request | 536926b | [maps.md](../../../tasks/feature-streams/maps.md) notes: `rational.ts` (triangle 01) and the circumcentre kernel block sweep S0 02 and triangulation 05. |
| Triangulation 04 and convexity 11 implemented | branch only (`7a07016`) | **Math reviews pending.** Each task file's status lists the points for its reviewer. |

## Remaining steps, in order

1. **Math reviews of 04 and 11**: two `bezeg-reviewer` Sonnet `medium` runs in parallel, each pointed at its task file's status. 04 points: termination without a cap, `predicateCount` at `delaunay.ts:132`, the incremental join of collinear points and the restart scan. 11 points: the ADR 0036 \(\delta/4\) guarantee, axis completeness for degenerate hulls, the equality assertions in random tests, and the `hypot` overflow skip. Then repair if needed, accept, update the task files, both READMEs and the stream lines, rebase and push to `master`.
2. **Triangulation 05** (Voronoi, B4) needs 04 accepted, plus exact circumcentres. Maps owns the circumcentre and circle kernel and `rational.ts` (maps notes). Check `master` for `src/compgeo/rational.ts` and the maps reply. If they are still missing, do not write them; leave 05 waiting.
3. **Sweep S0 02** waits for `rational.ts` too (ADR 0035). Same check.
4. When only gated or blocked work remains, set `Run state: waiting on G-REG` and note the `rational.ts` block. F2b and later wait for `G-REG`; A6 graph and D2 graph are Batch 3 / Curves. Then push, write a note and end without a successor.

## Checks and revisions

- At `3a46d5b` (after rebase onto `6432ca8`): tsc 0, `just unit src/compgeo` pass, `just lint src/compgeo` pass.
- At `7a07016` (04 and 11 added, on top of `536926b`): tsc 0, `just unit src/compgeo` pass (16 s), `just lint src/compgeo` pass. The full suite and the build were not run; hosted CI covers `master`.
- Workers this run: 2 implementers, 2 reviewers. Records are in `docs/agent-workflow/evaluation-log.md`.

## Lessons

- Script-check whether a task's mutation is visible to the named tests. Example 2's flips are the same under two scan rules; the task now demands an order reference, and the worker's mutation confirmed it.
- Small test repairs after a review (06) were cheaper in the handler than a worker round trip.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet `medium` (`high` for robust predicates, structures and Delaunay). Reviewers `bezeg-reviewer` Sonnet `medium` for mathematics, Haiku for single-concern slices. At most two implementation workers at once. Brief revision `handoff-v12`. Start each worker's watcher (`--until 135000`, Haiku 78000). Tell workers: no full suite or build; bound loops by count; restore mutations from a copy.

## Open decisions and risks

- None needing the owner. ADR 0036 was a handler decision under the stream's authority. If Curves disagrees with the margin, they reply in the stream file.
- Deferred, low: `polygonSimplicity` has no brute-force reference. The new copy from convexity 10 has not been seen in a browser (F2b smoke).
