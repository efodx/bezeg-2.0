# 3. One scene replacement path with positive teardown

Status: planned. Lane: Host; after task 2. Source: [specification §3](../../specs/architecture-deepening-backlog.md#3-one-scene-replacement-path-with-positive-teardown).

## Scope and entry points

- BaseGraph mount: 675-712.
- Lesson replacement paths: 485-497, 514-532, 606-624.
- `applyFigurePreset`: 928-1004.
- `boardInfrastructureObjectClosure`: 1027-1052.
- The five `disposeFigureScene` overrides, including `BaseCurveGraph.tsx:256-268, 402` and `BaseFunctionGraph.tsx:350-356`.

## Implementation and acceptance

- First inventory why each path differs: initialize or not, sweep or not, deferred or synchronous. Keep the deliberate differences and record why.
- Write tests for repeated replacement through each entry: mount, Preset reload, figure batch scene, lesson default scene, lesson checkpoint restore. They must assert:
  - board object counts;
  - live axes and infobox;
  - no duplicated callbacks or family constructions.
- Concentrate replacement in one module, so that every entry runs the same ordered steps. Disposal runs once per replacement.
- Teardown follows owned objects. Any remaining JSXGraph infrastructure knowledge lives in the board adapter, not the host.
- Keep the sweep as a checked fallback until tests show that no family leaves objects behind. Remove it only then.
- ADR 0015's transient contract and lesson recovery behavior stay unchanged.

## Verification

Run the real-graph contract tests (transient state, lesson restoration, scene content), the reload tests, typecheck and build. Delegate a smoke test across curve, spline, PH and function routes with Preset reload, figure batch and lesson exit.
