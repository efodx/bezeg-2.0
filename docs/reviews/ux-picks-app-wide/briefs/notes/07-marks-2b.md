# 07 slice 2b: view marks on the other four 2D pilots

Marks declared (must / nice), all memoized and finite-filtered:
- Transformations: FunctionTransformationGraph.tsx `viewMarks`: tracked point and image (must); none when u is outside the base domain.
- De Casteljau: DecasteljauGraph.tsx `viewMarks`: control points (must), 25 curve samples (nice); memoized on coordinates.
- Linear map: src/graphs/linear/linearMapMarks.ts (pure, per mode) called from LinearMapGraph.tsx `viewMarks`.
- Phase portrait: PhasePortraitGraph.tsx `viewMarks`: equilibrium and seeds (must); orbit samples inside the intent view (nice, 40 per half).

Tests: *.marks.test.tsx beside each graph (18 tests). Break check: 07-marks-2b-break.log, 07-marks-2b-break2.log.
Browser: 07-marks-2b-browser.log (script .command-logs/h6-smoke-07/marks2b.cjs). Not verified: marks read directly in the browser (visible JSXGraph points used as a proxy).
Open: a `stripDrag is not defined` crash in BoardCards (src/workspace, not this slice) appears when the De Casteljau lesson opens.
