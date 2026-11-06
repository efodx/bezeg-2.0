# Curves stream: handler handoff 63

Handler 63 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06 after its 175k threshold fired. It replaces [handoff 62](handler-handoff-62.md).

## State

- **On `origin/master`:** everything through this note. **Batch B:** AB-B-1, AB-B-2a1 and AB-B-2a2 are done; the D2 graph is complete and unrouted.
- `origin/curves-lessons-d1-d3` is a safety copy, already on `master`. Delete nothing. The remote `worktree-stream-curves` is stale; never force-push it.
- No preview, worker or watcher of this handler should be running. Port 4314 is free.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).
- **Memory:** 10.5 GB free when last read; check it first.
- `gh` is not installed, so `just ci` fails with `spawn gh ENOENT`. Read hosted CI through `curl` on the public API: `/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>`, `/actions/runs/<id>/jobs`, and `/check-runs/<job id>/annotations`, which gives the failing assertions without a log download. FFmpeg as in [handoff 58](handler-handoff-58.md#state).

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `1871c518` | AB-B-1: `TraceCurvePairGraph` lifted, hulls tests untouched | Hosted CI passed |
| `32556619` | AB-B-2a1: graph core, step view, Presets, lesson operations | [Record](../../advanced-bezier/ab-b-2a1-graph.md). **Hosted CI failed; see below** |
| The next two commits | CI repair, then AB-B-2a2: controls, table, inset | [Record](../../advanced-bezier/ab-b-2a2-controls.md) |

**The failure of `32556619`.** Run 42168744598: `unit (3)` and `smoke` failed and `deploy` was skipped, so nothing broken reached Pages. `PresetCatalog.test.tsx` did not list `compgeo-bezier-clipping`. Handler 63 pushed after focused checks only. The repair adds the key to `PENDING_ROUTE_KEYS`.

Hulls and clipping focused tests passed on the final tree; the full `just check` passed apart from one assertion, then repaired, and `just build` passed. Hosted CI of this push is the first complete run.

## Next steps, in order

1. **Read hosted CI** for this push, every job. A failure comes first. `deploy` must have run: the `32556619` run did not deploy.
2. **AB-B-2b:** register `bezier-clipping` at `/bezeg-2.0/bezier/clipping`, `lesson: false`, recipe not run. **Remove `compgeo-bezier-clipping` from `PENDING_ROUTE_KEYS`** in the same slice. Measure the drag; the gate needs it. The browser pass has three questions from the records: whether grey dashes cover the dashed B, whether inline table styling holds at projection and phone width, and the real status of the tangent pair at \(10^{-10}\).
3. AB-B-3 to AB-B-6, in the [plan](../../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06).
4. The rest of Batch C.
5. The low-priority list, unchanged from [handoff 61](handler-handoff-61.md#next-steps-in-order) step 4.

## Open for the owner

Unchanged from [handoff 60](handler-handoff-60.md#open-for-the-owner).

## Risks and notes

Handoffs 61 and 62's "Risks and notes" still apply, and those they inherit.

- **A new Preset collection, route or catalog entry needs the full unit suite before a push.** Focused paths miss the exhaustive contract tests such as `PresetCatalog.test.tsx`. The cost here was a failed `master` run.
- **A copy edit breaks tests that pin text.** Search the tests for the old string first. Handler 63's *konveksni ovojnici* edit failed one assertion.
- **A worker brief for a graph and its tests is over budget in one slice.** The first AB-B-2a1 worker stopped at 135k at turn 35 with the host tests unwritten. Brief tests separately, or split sooner.
- **Bash heredocs with backticks and apostrophes failed once in this environment.** Write such files with the Write tool.
- **`grep -l` over `.command-logs` can pick an older run.** Select by a total unique to the run, or by the newest file.
- The two AB-B-2a1 workers' mutation table shows the pre-clip view rule is guarded only by `bezierClippingView.test.ts`, not by a host test.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-63.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
