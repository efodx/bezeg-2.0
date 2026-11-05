# Geometry stream: handler handoff 52

Written 2026-11-05 by handler 52 (Opus 5.5, auto, effort medium). Continues [handoff 51](handler-handoff-51.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher reached 175k after only 20 turns, just after Batch 3 was planned and task 24 was built.

## Done this run

1. **Hosted CI for the handoff 51 push:** run 41960596954 succeeded on `9803e852`, which descends from the failed `1db51752` run.
2. **Curves D2 state:** the AB-B graph has not started and waits on A6. ADR 0028 has clipping reuse the A6 model and graph. A note to Curves is in the stream file: do not start the D2 graph until task 25 is accepted.
3. **Batch 3 (A6) planned:** [tasks 24–29](../../../tasks/convexity-hulls/README.md#batch-3-a6) and the spec's new caveat example, on `master` at `fe55a363` and `378671b7`.
4. **Task 24 built, not accepted.** `src/compgeo/curvePairSubdivision.ts` and its test (26 tests). Worker checks: every table row matched, `just unit src/compgeo`, lint and tsc passed, and both mutations were caught (18 and 17 failures). I reran the focused test and tsc. **The mathematical review has not run.**

## Decisions made

- `CurvePairGraph` is a `PointSetGraph` subclass; `BezierHullsGraph` adds the trace. Both curves have the same degree, 2 or 3, so `model.points` splits in half with no extra state.
- Drawn hulls are exact: pieces of a grid net are dyadic and scale to integers. No off-grid hull is built.
- The default crossing pair stays, and the lesson explains its \(8\) pairs. Exact counts for six pairs are in task 24.
- The caveat uses the near-miss pair \((4,0),(8,2),(2,6)\) and \((5,0),(7,4),(3,6)\), disjoint with a gap of about \(0.0108\). Vertically offset parabolas separate at depth 1, and no visible gap survives to depth 4. A pigeonhole example (more pairs than crossings) was searched for on shared-\(x\) quadratics and does not exist on the half grid.
- Worker choices to confirm in the review: `curvePieces` accepts depth up to 5 for the near-miss test, while `pieceHull` and `curvePairRun` stop at 4. Payloads are `{depth, candidates, kept, discarded}`.

## Branch state

`origin/master` holds this note. **Task 24 is not on `master`:** it is one commit on top of it, on local `stream-geometry` and on `origin/geometry-batch3-wip`. Check `git log origin/master..HEAD` shows it. Its evidence logs are untracked at `docs/reviews/convexity-hulls/24-*.log`.

## Next steps, exactly

1. Confirm hosted CI for this push (`gh run list --branch master`).
2. Run the mathematical review of task 24 (`bezeg-reviewer`). Include the `pieceHull` degenerate cases, the fold's cumulative test count, and whether hierarchical pruning can differ from all-pairs under the margin. Repair, set 24's status to accepted, and push.
3. Tasks 25, 26, 27, then 28 and 29. Each is one worker slice of about 30 turns, with host tests early. 25 is the largest: if it runs long, split the `CurvePairGraph` base from the `BezierHullsGraph` playback. Run the lesson smoke before accepting 28.
4. F5 poster and F6, as the end of [task 29](../../../tasks/convexity-hulls/29-lesson-bezier-hulls-tests.md) says. Convexity is then complete. Tell Curves when 25 is accepted.
5. **Cleanup needs the owner.** `origin/geometry-batch2-wip` can be deleted with permission, and `origin/geometry-batch3-wip` once task 24 is on `master`. The other lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. I did not ask this run; ask before acting.

## Risks and lessons

- **Start-up context is the budget.** The stream files carry very long status lines, and printing `geometry.md` and `curves.md` whole took much of this run's 175k. Read them with `grep` or `cut -c1-300`, and read only the sections you need.
- **`bash` heredocs failed here twice:** one on an unmatched quote in a large multi-file command, one on Python escapes. Use the Write tool for task files, and a script file for edits with backslashes.
- A `git add` chain after a failed step still commits what it can. Check each step, or end the chain with `&&`.
- `tsc | tail` reports `tail`'s exit code. Read the output instead.

## Live processes

The 215k self-watcher, stopped at this handoff. No worker or preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet; Haiku for a routine visual check), smoke `bezeg-smoke` (Sonnet). At most two at once, each with the watcher the launch hook prints.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 54" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
