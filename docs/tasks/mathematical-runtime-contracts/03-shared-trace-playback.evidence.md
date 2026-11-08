# Task 3 evidence, slice 3a: behaviour matrix and policy pilot

Base revision f9996d30 (dirty worktree). Items 1 and 2 (slice 3a). Items 3 and 4 (migration of the other graphs) are done in slice 3b, appended at the end.

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

# Slice 3b: migration of the remaining trace graphs (work items 3 and 4 done)

Base revision 6fee4610 (dirty worktree).

## Migrated

All use `TracePlayback` and keep only domain configuration, the `setState` step/model wrapper, lesson `set-trace-step` and rendering: `BentleyOttmannGraph` (400 ms), `MonotonePartitionGraph` (500; `MonotoneTriangulationGraph` inherits), `EarClippingGraph` (600), `DelaunayGraph` (600), `FortuneGraph` (400), and `TraceCurvePairGraph` (400; `BezierHullsGraph` and `BezierClippingGraph` inherit). `HullRobustnessGraph` inherits `HullTraceGraph` (migrated in 3a) and has no controller code.

Deleted from each: controller, `controllerDisposed` and `advancing` fields, `createController`, `MAX_PLAYBACK_STEPS`, `atEnd`, `advance`, the Next/Play/Pause/Reset bodies (now one-line delegations), the `setState` reset branches (now `playback.settle(...)`), mount/unmount controller code, the `if (this.controller) pause()` hooks (now `playback?.halt()`), the import `reset(step); requestRender()` (now `restoreTo(step)`). About 100 lines per graph; seven files, 75 added / 214 deleted lines before the tests.

## Policy change

`settle` now resets the controller to the step the graph's write left in the store (`host.step()`), instead of choosing between a named step and 0. For every edit that is 0 (the graph's wrapper wrote it) or the named step, so behaviour is unchanged; for Fortune it is the kept, clamped step. This removed the need for a "keep step" flag: the Fortune difference lives only in its `setState` wrapper, as before, with no controller-side special case. No other host option was added; tick length stays the existing `intervalMs()`.

## Final deliberate differences

- Tick length per graph through `intervalMs()`: hull 400 (slow edge test 50), interval 400, Bentley-Ottmann 400, monotone partition and triangulation 500, ear clipping 600, Delaunay 600, Fortune 400, Bezier pairs 400. Policy test: "each graph ticks at its own interval" (50/400/500/600).
- Fortune keeps the step on a model edit (its `setState` wrapper clamps the old step; the policy restarts from the step in the store). Policy test: "a model edit that leaves the step where the graph put it ... restarts a finished playback from there". Note this reset is not observable through the count of `IterationController` (only the limit 100000 reads it); the test pins the restart from the kept step, and the Fortune host tests pin the kept step itself.
- Delaunay clears its triangle selection (on a model, triangles or step change) and counts a `triangles` edit as a model edit: both stay in `DelaunayGraph.setState`, which passes `edited` to `settle`. No policy option: the policy only needs "edited", covered by the model-edit tests. Gap against the brief, which asked for explicit host options: the selection clearing also fires on plain step changes, so it does not fit an edit hook.
- Hull algorithm switch (`stop`), interval hover, run settings key of the Bezier pairs: domain extras, unchanged.
- Incidental, removed: Fortune's inlined step write (now a private `setTraceStep` like the others), the private copy of the policy in `TraceCurvePairGraph`.

## Tests

Policy (`tracePlayback.test.ts`, now 9 tests): added the Fortune-restart test and the per-graph tick test. Mutations: dropping `modelChanged ||` in `settle` fails the new restart test (and the existing model-edit test); making `intervalMs` constant 400 fails the tick test.
Real-graph Next versus Play, one per graph, comparing a nonempty final drawn state and panel: Bentley-Ottmann, monotone partition, monotone triangulation, ear clipping, Delaunay, Fortune, Bezier hulls, Bezier clipping, hull robustness (nine tests, in each graph's `*.host.test.tsx`).
No existing test was deleted or changed.

## Wall time and checks

Wall time of the touched host and lesson-action files (`just unit`, 2 workers, machine shared with other runs): 21 files (nine graphs' host and lesson-action tests, two Bezier controls tests, policy, hull, interval) 123.7 s before the nine real-graph Next/Play tests were added; no before figure for the same set was taken (no clean baseline checkout was available, and the 3a baseline covered only four files). The nine new tests each render two real graphs; Fortune file alone 13 s after. Eight compgeo lesson files (`src/learning/content`) 44.5 s. Not a saving; contention noise is large.
Checks: `just typecheck` passed, `just lint src/graphs/compgeo` passed, `just build` passed, the 21 files passed (before the new tests), the ten files with new tests passed, eight lesson files passed.

## Gaps

No browser smoke. The new real-graph Next/Play tests were not individually mutation-tested; a mutation run was started but hung because the mutation (a run that never reaches "complete") made Play loop, and was abandoned (shared `advance` was mutation-tested in 3a). Class comments of the migrated graphs still mention "the one `advance()`" and `IterationController` in prose.
