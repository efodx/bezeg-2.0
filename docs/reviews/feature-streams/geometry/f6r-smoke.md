# F6 repair recheck: browser smoke (2026-11-02)

Target: http://127.0.0.1:4313/bezeg-2.0 (production build, branch stream-geometry at 0ba214ac plus uncommitted repair edits). Viewport 1366x768, fresh contexts, Chromium headless. Raw data: `results.json`; screenshots: `check1-*.png`, `check2-<alg>-<lang>.png`. Probe scripts are outside the repo.

Marker method: on-board point labels (`div.JXGtext` with text P1..Pn) and point dots (svg ellipse/circle) measured against the board svg rect. Pass = every label and dot at least 10 px from each edge, label count equal to the number of point x-fields.

## Check 1: layout at 1366x768, SL (PASS)
- /compgeo/polygon-area: board 928x507; 5 of 5 labels; minimum edge margin 67 px; P5 top margin 67 px.
- /compgeo/convex-hull: board 928x507; 9 of 9 labels; 9 of 9 dots; minimum margin 67 px; P5 top margin 67 px.

## Check 2: two points (0,0), (2,1) on convex-hull (PASS for notes; PASS with caveat for markers)
Points set by Počisti (clear), then two Dodaj točko submissions. x values read back as 0, 2.
- Markers, all six runs: 2 of 2 labels, minimum margin 78 px. Dot detection found 1 of 2 dots in every run, so the dot assertion was not confirmed. Not investigated.
- SL step-1 note, all three algorithms: "Pri manj kot treh različnih točkah so vse točke oglišča ovojnice." No "Verigi združimo" in any step through the end.
- EN, live switch via #bezeg-language, all three: "With fewer than three distinct points, every point is a hull vertex." No "The chains are joined into the convex hull." in any step.
- Algorithm selection was confirmed by reading the select value for each run.

## Check 3: control, default 9 points, monotone chain (PASS)
- Stepped to the end (56 steps). "Verigi združimo v konveksno ovojnico." appears at step 55 of 56.

## Console
- No console errors or page errors in any run.

## Coverage gaps
- Dot count in the 2-point state (1 of 2) is unexplained.
- Only desktop 1366x768 tested; no narrow or touch viewport.
- No check of EN layout for check 1 (labels and boundaries in English), no keyboard check.
- Visual overlap of labels with the board edge was checked by rect only, not by eye (screenshots written, not opened).
