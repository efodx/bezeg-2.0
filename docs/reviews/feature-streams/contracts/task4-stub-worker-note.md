# Task 4 stub worker note (handoff-v13)

Test-only changes; production code untouched (md5 of the BaseFunctionGraph/BaseGraph diff identical before and after the check-C edit).

- Removed the `graph.setState = vi.fn(...)` lag stub and the `asyncState` option from 21 function/complex graph tests; removed the bare `graph.setState = vi.fn()` stubs in Euler/Quadrature lesson tests, BaseFunctionGraph.test, LinearMapGraph.test, linearMapsChapter.test, complexMapsChapter.test and the "stored board state" tests. Tests that count `setState` calls use `vi.spyOn(graph, 'setState')` (calls through).
- Cause 2 (kept, retitled "...reads the earlier actions through the model, with the flat state following it"; the assertion that the flat state is stale became `graph.state` matches `graph.model`): 16 tests, one per file: Accumulation, ArcLength, AreaBetweenCurves, Bisection, Continuity, Convexity, Darboux, DefiniteIntegral, Derivative, ExponentialFunction, Extrema, FixedPoint, LinearFunction, MeanValue, Sequence, Taylor, TrigonometricFunctions, UniformConvergence (title starts "a multi-action scene applied in one synchronous tick"). The two `{asyncState: true}` lesson-scene tests (ComplexMultiplication, UniformConvergence) and the "capture and restore ... read in the same tick" tests only lost the lag wording; their expectations are unchanged.
- graphTransientStateContract.tsx: `model` is excluded from the graphState key comparison only for `graph instanceof BaseFunctionGraph`.
- Check C: with savedGraphState returning this.state, GraphTransientState.part1 fails 10 tests (extra key `model`); reversed, md5 equal.
- linearMapsChapter, complexMapsChapter, LinearMapGraph, GraphTransientState part1-4: passed once the stub was removed; no production defect found.
