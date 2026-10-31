# Geometry stream — handler handoff 7

Written 2026-10-31 by handler 7 (Opus 5.5, permission mode auto, effort medium). No successor: only gated or blocked work remains.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`, pushed to `master`. `node_modules` is a junction to the main checkout: delete the junction itself before removing the worktree.
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: waiting on G-REG`.
- Untracked files that are not ours to commit: `docs/reviews/convexity-hulls/0[578]-*.log`.

## Done this run

| Item | Commit | Notes |
| --- | --- | --- |
| Triangulation 04 accepted | c1d647a | Math review: no must-fix. Termination without a cap, strict visibility and the restart rule confirmed. `predicateCount` documented as one per edge test. |
| Convexity 11 accepted | c1d647a | Math review: no must-fix. The random test's equality with the margin-free reference held only one way. It now asserts the implication and the \(2\delta\) converse against an exact reference with a margin, checked by mutation (no normal axes fails 2 tests). ADR 0036 now states that the \(\delta/4\) bound is Euclidean, plus the converse. |
| Stream set to waiting | this commit | 05 and sweep S0 02 are blocked on Maps' `rational.ts` and circumcentre kernel, which are not on `master`. |

## Next, when restarted

1. If `src/compgeo/rational.ts` and the circumcentre/circle kernel are on `master` (see the [maps notes](../../../tasks/feature-streams/maps.md)), write triangulation task 05 (Voronoi, B4) and sweep S0 02 (ADR 0035), then implement them.
2. When `G-REG` opens: convexity F2b and later.

## Checks

At `a99dc40` (rebased on `2a77839`): tsc 0, `just lint src/compgeo` pass, `just unit src/compgeo` pass. The full suite and the build were not run; hosted CI covers `master`.

## Open risks (low, deferred)

- The 11 reference shares the implementation's candidate axes, so axis completeness rests on the A6 counts and the hand-built cases. An independent hull/LP reference would close this.
- The 04 flip-order reference shares `edges()` order and `flip` with the implementation.
- `polygonSimplicity` has no brute-force reference. The convexity 10 copy has not been seen in a browser (F2b smoke).
