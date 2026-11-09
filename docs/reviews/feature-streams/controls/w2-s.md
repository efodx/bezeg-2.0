# W2-S evidence (Slider additions)

- Pre-change: 6 of the 7 new Slider.test cases failed before the props existed (log `.command-logs/w2-s-pre.log`); the opt-in refusal case passed by design.
- After: Slider.test 14 passed; `src/inputs`, `sharedControls`, Simson/InscribedAngle/Inversion/ThreeViews host tests passed (`w2-s-unit.log`, `w2-s-unit2.log`: 373 passed, then the 3 tests that asserted the C1 refusal of out-of-range angles were updated to wrap and passed).
- Suite durations: src/inputs + sharedControls + four graph test sets 59 s (2 workers, under load); three compgeo graph files 78 s after (no before measured).
- Typecheck: only other workers' errors (PointInPolygonGraph); none in my files.
