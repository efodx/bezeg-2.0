# MathJax immediate failure as the default in board-shim tests

- `installBoardShims` (src/graphs/base/realGraphTestHarness.tsx) now calls `failMathJaxLoads()` once per test file (module state, idempotent); `allowMathJaxLoads()` is the explicit opt-out. No existing test needed it (none that uses the shims touches the `MathJax-script` id). Tests mocking `loadMathJax` never add a script, so their mocks are unaffected.
- parity.ts: per-recording toggle and import removed (every parity test file calls `installBoardShims`).
- `just unit src/workspace src/graphs/base`: before 7m28s, 19 failed (sharedControls.graphs.test.tsx); after 8m08s, same 19 failed. Durations are machine-load dependent.
- Full `just unit` (42 min, queued behind other checkouts): 6 files / 29 tests failed: sharedControls.graphs (pre-existing), SharedPointDecisions, interpolationFamilyControls, pointCountSceneLifecycle, interpolationLessonViews (UntaggedWriteError "interp-rule" in InterpolationGraph, from the concurrent Hermite/interpolation conversion), declarationContract (passed on rerun alone: flake). Logs: .command-logs/h13mj-*.log.
