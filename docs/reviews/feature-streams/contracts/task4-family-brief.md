# Task 4 family migration brief (handoff-v13)

Shared brief for work item 3 of [one live function model](../../../tasks/mathematical-runtime-contracts/04-live-function-model.md). Spec: `docs/specs/mathematical-runtime-contracts.md` section 4, "Representation", F1-F4. The dispatch names your families. The pattern comes from the pilots at `886a8822`; see `git show 886a8822 --stat` and [the pilot note](task4-pilots-worker-note.md).

## Role

`bezeg-worker`, worktree `.claude/worktrees/stream-contracts`. Edit only the production file and test files of the classes in your families. No Git writes. Do not delegate. Another worker may be editing other families in this worktree at the same time, so do not touch their files and do not treat their failures as yours.

## Families

| Family | Classes (each `<Name>Graph`) |
| --- | --- |
| F1 complex and linear maps | ComplexMultiplication, ComplexReciprocal, ComplexRoots, LinearMap |
| F2 elementary | ExponentialFunction, TrigonometricFunctions, FunctionTransformation, FunctionInverse, RationalFunction, PolynomialZeros, ConicFocal |
| F3 differential | Derivative, Continuity, Convexity, Extrema, MeanValue, Taylor, Euler |
| F4 integral | DefiniteIntegral, Darboux, Accumulation, AreaBetweenCurves, ArcLength, Quadrature, DensityArea |
| F5 iterative | IterativeFunction, Bisection, RootFinding, FixedPoint, Sequence, GeometricSeries, Clt |
| F6 approximation and statistics | FourierCoefficients, FourierSeries, Epicycle, RungeInterpolation, UniformConvergence, Correlation, LeastSquares, SummaryStatistics |

## Work

Production:

- Every `this.state.<modelField>` read and `= this.state` destructure of model fields becomes a read of `this.model`.
- Every `stateSnapshot()` call becomes `this.model`.
- Do not store `this.model` in a field. A local `const` inside one function is fine.
- Do not add a projection or a copy. A private helper that rebuilds a model field by field, such as `stateModel()`, is one: delete it and read `this.model` at its callers. Rewriting only its `this.state` read leaves a fresh object per call, which F1 and F2 forbid and the grep below does not catch by itself.
- Do not change evaluation, board code, cache keys or `memoView` calls.
- `this.state.initialized` stays.
- A comment that describes the old mirror gets reworded to the current behavior, without naming the flat fields.

Tests:

- `graph.state.<field>` reads become `graph.model.<field>`.
- `expect(graph.state).toMatchObject(graph.model)` and `expect(graph.state.a).toBe(graph.model.a)` compare only the projection and would fail once it is removed. Replace each with an assertion of the expected model values at that point, taken from that test's own earlier expected values or from what the test just applied.
- A test that writes `graph.store.replaceState({...graph.state, a: 3})` to set the model must drive the real path (`commitModel` or a command).

## Stop rule

Never change an expected numeric, geometric or board value, and never skip or loosen a test. If a read differs in meaning from before, or a test fails for a reason this pattern does not explain, leave it failing and report it with `file:line`, expected, received and your reason. Do not edit `BaseFunctionGraph.tsx`, `BaseGraph.tsx` or shared helpers: if a class cannot migrate without that, stop that class and report it.

## Checks, per family

1. `grep -nE 'this\.state\b|stateSnapshot\(|stateModel\(' <production files>` prints nothing except `this.state.initialized`.
2. `just unit <the family's test files>`. Read the `Tests` count from the `.command-logs` file named on the runner's summary line, not from a pipeline's exit code.
3. `just typecheck`. A failure in a file outside your family belongs to the other worker: report it only if it persists.

Finish one family completely before the next, and append its result to your note, because the handler commits per family. Run `just lint` once at the end. Do not run the full suite: the handler does. Use `just` recipes only, never bare `npm test`, `npx vitest` or `npx playwright`. Logs go under `.claude/jobs/`.

## Return

At most 200 words per family, with `file:line`: exact production and test files changed, `Tests` count, grep result, any read whose meaning might differ (for example inside a callback or an `importPreset` override), anything unexplained. Write bulky evidence to the note the dispatch names, which is also your handoff note. On `BUDGET HANDOFF`, stop, leave finished families finished, say which class you were in, and return partial.
