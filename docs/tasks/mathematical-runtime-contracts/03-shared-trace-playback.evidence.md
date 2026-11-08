# Task 3 evidence, slice 3a: behaviour matrix and policy pilot

Base revision f9996d30 (dirty worktree). Items 1 and 2 only; items 3 and 4 (migration of the other graphs) are the next slice.

## Policy

`src/graphs/compgeo/tracePlayback.ts` (beside `traceLessonActions.ts`, which it implements `TraceControls` for; it is compgeo trace policy, not a general runtime concern, and `IterationController` was not changed). `TracePlayback(host, scheduler)` composes one `IterationController` with a host: `runLength`, `step` (clamped, read from the store), `writeStep` (the graph's `setState`), `exportBusy`, `requestRender`, `intervalMs`. Methods: `nextStep/play/pause/resetTrace` (lesson `TraceControls`), `halt` (scene replace/figure dispose), `restoreTo(step)` (import), `settle(modelChanged, namedStep)` (called from `setState`), `stop` (algorithm switch), `mount/unmount` (fresh controller after dispose). Index stays in `SceneStore`; mathematics stay in the runs; lesson dispatch is `registerTraceCommands`.

Deleted from `HullTraceGraph.tsx`: controller fields/`createController`/`syncControllerInterval`, `advance`, `atEnd`, button bodies, `HULL_LESSON_COMMANDS`, `lessonCommand` (now `registerTraceCommands`), `MAX_PLAYBACK_STEPS`, the `setState` reset branches, mount/unmount controller handling. Same set deleted from `IntervalSweepGraph.tsx`. Net: both graphs about 100 lines smaller each.

## Behaviour matrix (nine repeating trace families; Hull robustness inherits Hull; Triangulation inherits Partition; Bezier hulls/clipping share `TraceCurvePairGraph`)

All have the same: Next = `controller.pause()+nextStep()`, Play = `controller.play()`, both refuse on `exportBusy` or at the end; one `advance()` writes `step`; `registerTraceCommands` (hull used a private copy, now removed); `stopLessonAnimations`/`beforeFigureCapture` pause; `syncReplacedScene`/`disposeFigureScene` pause; unmount disposes, mount re-creates; a step written outside `advance()` resets the controller to it (so a finished trace restarts).

| Aspect | Hull | Interval | Bentley-Ottmann | Monotone partition/tri. | Delaunay | Fortune | Ear clipping | Bezier hulls/clipping |
|---|---|---|---|---|---|---|---|---|
| Tick ms | 400, 50 for slow edge test | 400 | 400 | 500 | 600 | 400 | 600 | 400 (`TRACE_STEP_INTERVAL_MS`) |
| Model edit | step 0, reset | step 0, reset | step 0, reset | step 0, reset | step 0, reset; also clears selected triangle; manual flip counts as edit | keeps step, clamped to new trace; reset to it | step 0, reset | step 0 (subclass settings written with a step reset) |
| `set-trace-step` | no (has `set-algorithm`) | yes | yes | yes | yes | yes (own inline write) | yes | yes |
| Own extras | algorithm switch resets | hover highlight | none | none | triangle selection | none | none | run settings key |

Differences:
- Tick 50/400/500/600 ms: deliberate (cost of one step to read; slow edge test has hundreds of steps). Source: each constant exported and asserted by its tests. Policy takes `intervalMs()` from the host.
- Fortune keeps the step on a model edit (sweep position stays while a site is dragged): deliberate, documented in its class comment; needs `settle` to take a "keep step" mode. Not needed for the pilot; migrate with a host flag.
- Delaunay clears its triangle selection and treats `triangles` edits as model edits: deliberate domain extra; keep in its `setState`, call `settle` after.
- Hull-only `syncControllerInterval`: deliberate (algorithm picks the tick); now `TracePlayback.syncInterval`.
- Bezier pair graphs have their own copy in `TraceCurvePairGraph`; otherwise identical to hull. Incidental duplication.
- Fortune `setTraceStep` is inlined, the others call a private `setTraceStep`: incidental.
- Exports: all refuse Next/Play while `exportBusy`, pause at `beforeFigureCapture`; figure state is built from `sceneGraphState()` with the step clamped: identical, incidental to repeat.
- Replacement/disposal: identical; `halt` guards the base-class constructor window (`this.playback?.`).

## Tests

New `tracePlayback.test.ts` (7 tests, manual scheduler = deterministic frames, no real timers): Next/Play to the end same nonempty final step (5) and stop with nothing scheduled; one step per interval, no catch-up; Reset, Replay, seek after completion; model edit/named step; empty run and export busy refusals, seek-to-last refuses Next; shrinking run; halt/unmount/mount; interval change.
Real-graph additions: one Next-to-end versus Play-to-end test per graph comparing nonempty final drawn state (hull: curves and status; interval: sweep objects and status).

Mutations observed to fail the new assertions (mutation reverted each time):
- drop `!this.advancing` in `settle`: 4 policy tests fail.
- drop `atEnd` check in `nextStep`: empty-run/seek-to-last test fails (first attempt did not, so the render-count assertions were added).
- `unmount` without dispose: the unmount test fails.
- no `syncInterval`: interval test fails.
- settle ignores named step: Reset/seek test fails.
- `advance` ends one event early (`Math.max(last - 1, 0)`): both new real-graph tests fail (plus 9 existing cases).

Deleted test: `HullTraceGraph.host.test.tsx` "a step written outside Next and Play after reaching done restarts a working controller", covered by the policy's seek-after-completion test. Replaced by the Next/Play final-state test. All other hull and interval tests unchanged.

## Wall time (4 touched host files, `just unit`, 2 workers, machine shared)

Before 18.8 s; after 24.1 s in the last run (19.3 s in an earlier run before the new real-graph tests; the extra tests render two real graphs each). Policy file alone about 3 s. Not a saving: the real-graph Next/Play comparisons are new cost; contention noise is large.

## Checks

typecheck passed; lint on touched paths passed; four hull/interval host files passed; policy test passed. See the report for `check-changed` and build.

## Gaps

No browser smoke (separate slice). Other trace graphs not migrated. Fortune keep-step and Delaunay extras need `settle` options in the next slice.
