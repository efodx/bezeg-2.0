# Curve construction leak (Step 8 leftover)

- Fix: `AbstractJXGPointControlledCurve` constructor snapshots `board.objectsList` after the planar check and, on any throw,
  clears `jxgPoints`, sweeps everything created since (`sweepObjectsSince`), and rethrows. No listener is registered before
  the last throwing step (`board.on("update")` is last).
- Helper: `sweepObjectsSince(board, before)` exported from `src/graphs/base/OwnedScene.ts`; `constructOrSweep` now uses it.
- Test: `AbstractJXGPointControlledCurve.test.ts` (last test) - a subclass whose `getInitialCurve` creates points then throws.
- Observed: without the sweep, `expected 9 to be 3` (6 leaked objects); with it, passes.
- `just unit src/graphs/curves` passed (185s). `npx tsc --noEmit` exit 0.
- Logs: .command-logs/curve-leak-{before,after,tsc,check}.log
- Not covered: subclass constructors that create objects after `super()` returns (not swept by this change).
