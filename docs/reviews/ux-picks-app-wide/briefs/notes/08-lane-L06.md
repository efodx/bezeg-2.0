# 08 lane L06: function-inverse (partial)

Started 16:44, unit green about 17:00 (graph-check, parity-golden, tsc, lint not run yet).

## Done
- Parity recorded first: `functions/__parity__/function-inverse.json` (7 states) and its `SAMPLES` entry in `parity.test.tsx`. Recording rewrites `exponential-function.json`; I restored it with `git checkout` each time (check `git status` that it is unmodified).
- `FunctionInverseGraph.tsx`: `FunctionInverseIds`, `functionPanel()` (rows from the old panel, help = `function_inverse_note`), `parameterBindings` (`inverse-x0`, `inverse-base`, `inverse-restriction`), `declaration()`, `drawnObject`/`performAction`, `renderReadout` from the panel, `PuckOwned` around x0, base and both reveal buttons. Drag handler of P now runs under `runAs("learner")` (untagged write otherwise).
- Fragment `fragments/function-inverse.ts` (2 keys: `function_inverse_legend_connector`, `function_inverse_tangents`), registered in `fragments/index.ts`.
- Frames: 7 inverse steps in `schoolFunctionGraphsGuidedLessons.ts` carry `inverseFrame({...})`.
- New `FunctionInverseGraph.declaration.test.tsx` (6 states, actions, arbiter write).
- Own host test adapted: x0/base/switches are now pucks, so the test writes through `graph.parameters.write(..., 'learner')` and clicks `puckControl`; importPreset/reset wrapped in `runAs('learner')`; `boardObjects` ignores lazily created axis-tick labels; refusal text now the DomainError message ("Osnova a ne sme biti 1: ...") instead of the Slider hint.

## Placement
- Board: x0 (changed while watching), base (only when restriction is exp), inverse-curve and tangent switches (predict-then-reveal; lessons ask to flip them) as switch pucks.
- Orodja: restriction choice (3 options, but it defines the scene and lessons set it per step; setup).
- Legend: point entry replaced by connector PP' (one entry cannot show P and P' colours); default place unchanged.

## Not done
- Red check of the declaration test (break once, quote failure).
- `just graph-check function-inverse --route <route>`, parity golden check, `npx tsc --noEmit --pretty false` (was clean before the host-test edits), `just lint`.
- Observed: unit run `FunctionInverseGraph` + `schoolFunctionGraphsGuidedLessons` + `declarationContract` passed (log `.command-logs/L06-unit.log`).

## Closeout (second worker)
- Red check: legend id 'connector' -> 'connectorX' in the default state: `AssertionError: expected [ 'forward', 'inverse', …(2) ] to deeply equal [...]` (+ "connectorX"), 1 failed | 7 passed. Restored.
- `just graph-check function-inverse --route /functions/function-inverse`: PASS (contract 1, parity 2, golden 1, declaration 8; browser skipped). Log .command-logs/L06-gc.log.
- Parity golden check: passed (.command-logs/L06-golden.log).
- tsc clean; lint clean after removing unused FunctionReadout import; unit (FunctionInverseGraph, schoolFunctionGraphsGuidedLessons, declarationContract) passed (L06-unit2.log).
- Tooling: `BEZEG_PARITY_ID=<id>` filters parity.test.tsx; recording with it left other __parity__ files unmodified. Documented in converting-a-graph.md section 7 and 08-lane.md step 1.
