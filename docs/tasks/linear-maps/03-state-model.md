# 03 State model and Presets (F2a, Batch A)

Spec: Implementation Decisions (graph state), L1 acceptance 5–6, Testing Decisions (scene and Preset tests). Decisions: ADR 0025 §1–2. Follow the model/parse split of `src/analysis/complexModel.ts` and the Preset validation pattern used by its graph.

Scope: `src/linear/linearMapModel.ts` and its tests. Pure TypeScript.

Acceptance:

1. `LinearMapState`: `matrix` (snapped), `secondMatrix` (optional, for composition), `mode` `basis | determinant | eigen | ellipse | composition`, `testAngle`, `exampleId` (from `LINEAR_MAP_EXAMPLES` or `custom`), and toggles needed by Batch A (probe point, curve, square). Defaults: identity, mode `basis`.
2. `parseLinearMapState(unknown)` returns a typed result: valid state, or a structured error naming the field. Out-of-range or off-grid entries in imported data are rejected with an actionable reason, not silently snapped; numeric input from the UI uses a separate `snap` path that reports clamping. Non-finite values never enter state.
3. Derived values are never read from input: a Preset carrying extra derived fields is accepted with them ignored, or rejected, as documented in the test.
4. Mode change keeps the matrix; selecting an example sets the matrix and `exampleId`; editing an entry sets `exampleId` to `custom`.
5. Scene-action payload validators for `set-matrix`, `set-mode`, `set-test-vector`, `set-example`, applied in one synchronous sequence in a test (AGENTS.md lesson-scene rule).

Checks: `just unit src/linear`, then the full unit suite once. Report an observed failure for the parse rejections against a deliberate mutation.
