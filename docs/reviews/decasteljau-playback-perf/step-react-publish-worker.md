# React publish step: worker notes (partial, measurement not done)

## Change
- New `src/graphs/curves/bezier/decasteljauLiveParameter.ts`: `LiveParameter` external store (report/subscribe/getSnapshot).
- `DecasteljauGraph.tsx` and `DecasteljauGraph2.tsx` (duplicate playback code, both changed): the animation frame reports the drawn parameter to the live store at the 100 ms cadence and no longer calls `setState`. `setState({t, animationStatus})` stays on play, pause, stop, slider input, lesson actions, finish (Graph) and scene replacement. The store is created lazily (`liveParameter` getter) because `syncReplacedScene` runs during the base constructor, before subclass fields exist (a plain field initializer threw).
- `DecasteljauAnimationControls.tsx`: optional `live` prop, read with `useSyncExternalStore`; slider and `t =` readout use the live value while `status === "playing"`.
- New test `DecasteljauPlaybackPublish.test.tsx` (host renders counted by spying `getGraphCommands`).

## Pre-change failure of the new test (log: Desktop/bezeg-perf/before.log)
`playing frames move the slider ... without re-rendering the host`, both graphs: `AssertionError: expected 5 to be 1` (host renders after 4 frames vs after Play). The steering and finish tests passed on old code, as expected.

## Checks
- `just unit src/graphs/curves/bezier`: 248 passed, 1 failed (`registrationLoading.test.tsx`, timed out at 15000 ms; passed in the second batch run, so load-related).
- Related batch (GraphHostRealGraph, GraphTransientState, ControlsFollowGraph, GraphSceneReload, rational, registrationLoading): all pass.
- `src/graphs/ExportPausesPlayback.test.tsx`: 2 FAIL (DecasteljauGraph, DecasteljauGraph2, "beforeFigureCapture stops the playback and the drawn value stays put": expected 0.56 to be 0.5). The test reads `state.t` while playing as the "drawn value"; that is now the intentionally stale store value. It conflicts with "existing tests unchanged". The fix is a one-line change per case (`value: g => g.parameter`); my attempt to edit it was denied, so it is NOT applied. Handler decision needed.
- `tsc --noEmit` (run directly from main node_modules): clean. eslint on the changed files: clean.
- `just check-changed` could not run: the worktree has no node_modules ("Local typescript is missing").

## Not done: measurement
Production build needs `node_modules` in the worktree (vite cannot resolve `../node_modules/jsxgraph/...`). The worktree has a real, empty `node_modules` holding only caches; replacing it with a junction was denied. No baseline or change builds exist; no profile runs.
