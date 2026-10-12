# 1. Remove dead legacy layout and debug output

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), findings 13 and 14 (part).

## Goal

Delete code that no active route can reach, so later slices migrate less.

## Scope

- `BaseGraph.render()`: remove the non-workspace branch (`Container`/`Row`/`Col` layout) and everything only it uses: `Help`, `getTools` (all overrides, including `BaseCurveGraph.getTools`), the fullscreen `ToolTippedButton` there. Every active route has a workspace title; if a graph renders without one, render the workspace with the demonstration fallback rather than the legacy layout.
- `BaseCurveGraph`: remove `getSelect`, `getSelectableCurveArea`, `getSelectedCurveCommands`, `onSelectChange`, and the `curveSelected ? getSelectableCurveArea()` branch of `getGraphCommandsArea`, plus overrides such as `BasePhBezierCurveGraph.getSelect`, if nothing in the workspace path uses them. Keep `Commands` only if a workspace panel still renders it.
- `JGBox`: remove the fixed-size "magistrska" code.
- Graph classes that no route imports (check `src/Routes.tsx`, `src/demonstrations.ts` and tests, e.g. `IzpeljavaGraf`, `RationalBezierCurveCircleGraph4`, `RationalSubdivisionGraph`, `G1AffineSplineGraph`, `SubdivisionGraph` variants): delete them only if unreferenced outside their own tests; delete those tests with them.
- Remove `console.debug` from production code (`BaseGraph`, `PresetSelector`, `Presets`, and others found by grep). Keep `console.error`/`warn` used for real failures.
- Replace the `"preset-" + Math.random()` fallback name in `PresetSelector` with the first unused `preset-N` (N = 1, 2, ...) in the current collection.
- Remove commented-out dead code blocks touched by the above (e.g. the `geometryCache` "PLEASE DO NOT LET THIS INTO PRODUCTION" block).

## Out of scope

Behavior changes in the workspace, `@ts-ignore` removal (task 2), state management.

## Acceptance

1. No remaining references to the removed symbols; `tsc`, build and Jest pass (tests for deleted dead code removed with it; no other test weakened).
2. No `console.debug` in `src/` outside tests.
3. Saving a preset with an empty name produces `preset-1`, then `preset-2`; a unit test covers it.
4. All routes in `src/demonstrations.ts` still map to graph components.
