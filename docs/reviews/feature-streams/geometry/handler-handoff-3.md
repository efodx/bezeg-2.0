# Geometry stream — handler handoff 3

Written 2026-10-31 by handler 3 (Opus 5.5, permission mode auto, effort medium) at its 150k soft threshold.

## Where things are

- Worktree `.claude/worktrees/stream-geometry`, branch `stream-geometry`; everything committed is on `master` (last: the commit adding this note). `origin/stream-geometry` still holds an old WIP commit; leave it (updating it needs a force-push). `node_modules` is a junction to the main checkout (delete the junction itself before removing the worktree).
- Stream file: [geometry.md](../../../tasks/feature-streams/geometry.md), `Run state: active`. Family tasks: [docs/tasks/convexity-hulls/](../../../tasks/convexity-hulls/README.md).
- Untracked, not ours to commit: `docs/reviews/convexity-hulls/0[578]-*.log` (worker logs; leave untracked as before).

## Done this run

| Item | Commit on master | Notes |
| --- | --- | --- |
| Batch 1 task files 07–10 | 9b294a1 | A2 numbers rechecked by script; crossed quadrilateral \((0,0),(6,0),(0,6),(3,6)\) doubled sum 18 added as the non-symmetric example |
| Batch 0 accepted, `G-CG` open | 69be60e | `just check` green at aabaf9f (5907/5907 unit, lint, tsc, build). Blockers were other streams' (curves 57756e6, c1ebefb; maps 6c4e553; functions aabaf9f), fixed by their owners on request. Curves handler 8 acknowledged; no maps handler was live |
| Task 07 area/lattice kernel accepted | e162937 | Sonnet worker; Sonnet math review found one weak exactness test, repaired, value checked by the handler |
| Task 08 slow test and gift wrapping | the WIP commit before this note | Implemented, **math review pending**; details and worker evidence in the [task file](../../../tasks/convexity-hulls/08-slow-hull-gift-wrapping.md) |

## Remaining steps, in order

1. **Math review of task 08** (`bezeg-reviewer`, Sonnet `medium`): traces against the task and spec A4; confirm the throw at `src/compgeo/giftWrapping.ts:63` is unreachable for valid input (else make wrapping total); check `hullInput.ts` keeps the chain's semantics; tests non-vacuous. Then accept 08 in its file and the README, push.
2. **Tasks 09 and 10** (F2a graphs; 09 depends on 05+07, 10 on 03+05+08). Briefs follow handoff-v12 like the 07/08 briefs (scope, entry files, verified numbers, `just lint` in checks, single test slot, low machine memory: no full suite/build in workers). One worker each, Sonnet `medium`; 10 can start in parallel with 09 once 08 is accepted. Engineering + UI/accessibility review each; production build after locale changes.
3. Then F0 for triangulation (T0 kernel incl. `incircle`, Sonnet `high` because of robust predicates) and sweep (S0, rational ADR). When only gated work remains, set `Run state: waiting on G-REG`, push, write a note, end.
4. Write the `subagent-flow-evaluation` do-log records: one for convexity Batch 0 (still owed from handler 2) and one for Batch 1 workers 07/08 (07: 1 repair round after review; 08: an out-of-memory mutation loop before the guard existed).

## Checks and revisions

- `just check` at aabaf9f: all green (above). After that: `just unit src/compgeo` and `just lint src/compgeo` pass at e162937 plus the 08 files; tsc clean at e162937.
- Hosted CI: 69be60e was in progress at last look; earlier master runs green. Check `gh run list --branch master` for e162937 and later.

## Lessons for this stream

- `just check` stops at the first failing step; other streams' lint errors on `master` block it before unit tests. Message the owning handler with the `file:line` and wait for the fix rather than editing their files; it took three rounds this run.
- The machine is short of memory: background commands were reaped twice; do not restart a reaped command without the owner (the owner agreed once this run). Tell workers not to run the full suite or build. A mutation that makes an algorithm loop can exhaust memory; ask workers to bound loops before mutating.
- Fetch, rebase, tsc and push with no other steps between; `master` moves every few minutes.

## Settings to keep

Opus handler, `--permission-mode auto`, `--effort medium`. Workers: `bezeg-worker` Sonnet `medium` (`high` for robust predicates or incircle), reviewers `bezeg-reviewer` Sonnet `medium`, Haiku for routine single-concern slices. At most two implementation workers. Brief revision `handoff-v12`. Start each worker's budget watcher (`--until 135000`). Path-filtered `just unit <path> --maxWorkers=2`.

## Open decisions and risks

- None needing the owner.
- Deferred, low (from handler 2): `polygonSimplicity` has no brute-force reference; upper-chain pops only via the hull oracle; the scene-change test assumes two board objects per point.
- Task 07: `degenerate` orientation is in the result type but unreachable for simple polygons; harmless, 09's readout need not render it.
