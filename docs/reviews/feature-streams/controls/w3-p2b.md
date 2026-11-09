# W3 P2b evidence: one trace playback policy

Policy moved with `git mv` to `src/graphs/base/tracePlayback.ts` (and its test); compgeo imports updated (import lines only).

## Behaviour matrix (before and after; unchanged unless noted)

| Row | Function iterations (Bisection, Fixed point, Series, Root finding, Sequence, CLT) | De Boor | Subdivision |
| --- | --- | --- | --- |
| Next | pauses, one transition; throws DomainError at the end (graph keeps the message, only when not export-busy) | pauses, reveals level; false at end | pauses, reveals round; false at cap |
| Play | refused at end/export busy | at end restarts at level 0 (kept in graph, after the busy check) | refused at cap/busy |
| End | transition outcome completes the run | level = degree | round = cap |
| Reset | subclass `resetIteration` (step 0) | level 0, paused | round 0 and start polygon, paused |
| Edit while playing | `replaceModel` pauses, controller follows revealed step | points/knots/degree/t pause, level kept (via `settle(edit, false)`) | edits call `pause()`, round kept; rule change to 0 |
| Export busy | Next/Play refused by the policy | policy | policy |
| Preset restore | paused at loaded step (`restoreTo`) | `restoreTransientState` -> `restoreTo(level)` | `restoreTo(data.round)` |
| Lesson actions | unchanged | unchanged | unchanged |
| Unmount | `unmount()` disposes, `mount()` recreates | same | same |

CLT derives from `IterativeFunctionGraph`; included.

## Policy extension (additive)

`TracePlaybackHost.writeStep` may return the step's `IterationOutcome`; `advance()` uses it, else the old `runLength` comparison. Function iterations cannot know their run length ahead of time (termination by tolerance, exact root, divergence), so their host reports `runLength = index + (canAdvance ? 2 : 1)` and `writeStep = transition()`. Compgeo hosts return void: unchanged.

## Tests changed

Tests that read the old protected `controller` now use `graph.playback.isPlaying` or `graph.playback['controller']`.
