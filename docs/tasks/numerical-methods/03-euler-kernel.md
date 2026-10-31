# 03 Euler kernel (F1, Batch C)

Spec: N5 in [numerical-methods-lessons.md](../../specs/numerical-methods-lessons.md#n5-direction-field-and-eulers-method). Drawing is not part of this task.

Scope: `src/analysis/odeEuler.ts` and tests. Pure TypeScript.

Acceptance:

1. Closed ODE example list: `y' = y` (exact `e^x`), `y' = x − y` (exact `x − 1 + 2e^{−x}`), and the optional `y' = y^2` (exact `1/(1 − x)` from y(0) = 1, blow-up at x = 1). Each has `F(x, y)`, the exact solution through a given initial point where the list has one, plain and undelimited LaTeX forms, and a default initial point.
2. `STEP_SIZES = [1, 0.5, 0.25, 0.125, 0.0625]`. A validator rejects any other step.
3. `eulerPath(example, x0, y0, h, xEnd)` returns the polyline nodes and a termination reason: `reached-end`, `non-finite`, or `left-window` (|y| above a stated bound). It never returns non-finite nodes.
4. End values to x = 1 from (0, 1): for `y' = y`, 2.25, 2.4414, 2.5658 with errors 0.468, 0.277, 0.152 and ratios 1.69, 1.82. For `y' = x − y`, 0.5, 0.6328, 0.6872 with errors 0.2358, 0.1029, 0.0485.
5. One step equals `y_k + h·F(x_k, y_k)` exactly for h = 0.5. The test uses exactly representable values.
6. `directionField(example, window, cols, rows)` returns segment centres and slopes. A test shows that the slope at a sample point equals `F(x, y)`. Non-finite slopes are omitted or flagged, never returned as numbers.
7. `y' = y^2` from (0, 1): the exact solution blows up at x = 1, but Euler's polyline lags it and stays finite there. With a far end (e.g. xEnd = 10) the run stops with `left-window`, all nodes bounded and no off-screen segment drawn. Corrected by the handler after the worker's finding; the spec's N5 acceptance 3 asks only for a visible stop.

Checks: `just unit src/analysis`, then the full unit suite once. Report an observed failure of each new assertion against a mutation.
