# 05 puck fixes

1. `RangeParameter.bigStep` (value units, as the Slider prop; default ten steps): `graphDeclaration.ts`, honoured in `RangePuck.tsx` key handler. Declared: composition angle 6, linear-map matrix entries 1, phase entries 1, phase zoom 1, phase time TIME_BIG_STEP. Taylor, FunctionTransformation, Decasteljau sliders passed no bigStep.
2. Snap notice: `parseEntry` flags `snapped`; `RangePuck.submitEntry` sets `puck_snapped` ("Zaokroženo na {value0}." / "Rounded to {value0}."), fragment `workspace-pucks.ts`.
Tests: ParameterPuck.test (new, failed first on the empty notice), LinearMapComposition.host, LinearMapGraph.host, PhasePortraitGraph.test.
