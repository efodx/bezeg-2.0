# 08 bezier parity

Marker `data-parity-retained`: set by `CurvePointControls` (prop `parityRetained`, CurvePointControls.tsx) from both BaseCurveGraph call sites when `declaresCurveWorkspace()`. `readPanel` (parity.ts) skips rows, notes, outputs inside it.
Before: bezier recording had only the count `<output>` ("4","5"), no declared row -> parity failed. Declaration shows no values (common curve declaration: legend, actions, marks), so n/a path is honest: new `curves/bezier/__parity__/bezier.golden.json` (one empty state; new file, no other golden touched). Hand recording `bezier.json` and the SAMPLES entry removed.
`parityGolden.test.tsx` check mode now also covers `declared` ids of the partition (graph-check golden stage found no test otherwise).
Test: `declare/parityRetained.test.tsx`.
Results: just unit src/graphs/base/declare passed; all-ids golden check passed (no golden changed); typecheck passed; graph-check bezier PASS (all six stages; browser stages ran against the stale build).
Logs: smoke/08-round1/bezier-parity-*.log.
