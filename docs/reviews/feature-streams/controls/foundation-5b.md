# Foundation 5b: shared behaviour test (evidence)

Helper `src/inputs/sharedControlBehaviour.tsx` (`numericFieldBehaviour`, `sliderBehaviour`, `countSetterBehaviour`; header documents the shape). Bare controls: `src/inputs/sharedControls.behaviour.test.tsx` (NumberInput, Slider, CountSetter without and with `onSet`). Real graphs via `realGraphTestHarness`: `src/graphs/base/sharedControls.graphs.test.tsx`.

Consumers: numeric field geometric-series terms, accumulation a; slider geometric-series a, interp-lagrange position; count setter bspline-deboor points, interp-lagrange points. All real-graph controls are in the Edit tab. Refusal (and the count bound reason) run in sl and en; other cases in sl.

## Findings

1. Host Reset leaves a field's refusal hint on screen: after a refused typed value, `graph.reset()` restores the value but the `number-input-hint` ("Vnesi vrednost med ...") stays (`src/inputs/NumberInput.tsx:97` the sync effect updates the draft, never the hint). Seen on all four numeric/slider consumers. The four Reset cases run with `it.fails` (`knownGap`) so the suite is green and fails once fixed; remove the `knownGap` entries then. Bare controls pass only because the test remounts them.
2. Neither real CountSetter offers a typed field (no `onSet`: `DeBoorGraph.tsx:338`, `InterpolationGraph.tsx:271`), so Escape and typed keyboard cases return early for them; the bare setter with `onSet` runs them.
3. Not modelled: model-refused in-range values (`rejectedHint` path). Home/End are not in `stepKeys.ts`; the numeric case asserts they change nothing.

## Mutations (restored; logs `.command-logs/5b-mut-*.log`, failing cases of 52+bare)

keystroke commit 11; Escape not reverting 7; `stepKeys` ignoring Shift 6; step not clamped (message at the limit) 6; range refusal silent 14; plus never unavailable 16; wrong inspector tab in graph specs 6. Count `pressed` not cleared on change: 0 (equivalent mutant: the shown reason is also gated by `atMax`); the count Reset case is therefore only checked for the restored count and reason.

## Checks

`just typecheck` passed; `just lint` on the three new files passed; `just unit src/inputs src/graphs/base/sharedControls.graphs.test.tsx` passed (`5b-final.log`). Not run: smoke, full suite.
