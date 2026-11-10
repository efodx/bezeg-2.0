# Step 7 slice 2 browser smoke

Target: production preview http://localhost:4327/bezeg-2.0/ (cherry-pick bd12695e of 728b83be). Chromium, 1280x800, Slovenian, fresh context per scenario. Script: `.command-logs/s7-2-smoke/run.cjs` (fixed: storage key is `bezeg-2.0:preset-bspline-curve`, shape `{data:[entries]}`, entry has `graphState`/`data`; points are SVG `ellipse` elements).

## Failures / findings first

1. S1.3 pan not observed. Pan drag on empty board (two start positions) changed neither point ellipses nor labels, so "view stays after refusal" is only weakly evidenced (points and labels unchanged). Possibly the harness (pan not performed) rather than the app; not diagnosed.
2. Wording issue (observed, not a functional failure): the 17-point refusal on NURBS reads "B-zlepek stopnje 1 potrebuje vsaj 2 kontrolnih točk, prednastavitev jih ima 17." It names a minimum of 2 although the problem is exceeding the 16-point limit. My synthetic Preset is degree 1 with 17 points; the message may be the intended generic one, but it does not state the limit.

## Results

| # | Check | Status | Evidence |
|---|---|---|---|
| S1.0 | Save Preset on NURBS | Passed | stored entry `s72-good` |
| S1.3 | Pan changes view | Failed (see 1) | no scene change |
| S1.4 | Point drag changes scene | Passed | ellipses moved |
| S1.5 | 17-point Preset refused, notice names it | Passed | "zbirka bspline-curve, prednastavitev s72-bad17, polje data: ..." |
| S1.6 | Previous selection kept | Passed | select = s72-good |
| S1.7 | Points/labels unchanged after refusal | Passed | identical snapshot |
| S1.8 | Dragging works after refusal | Passed | scene changed |
| S1.9 | No console/page errors | Passed | none |
| S2.2 | Degree-1 Preset refused on Blossom with notice | Passed | "cvetenje je na voljo za stopnji 2 in 3, krivulja pa ima stopnjo 1" |
| S2.3 | Blossom scene unchanged | Passed | snapshot identical, select kept |
| S2.4 | Same Preset loads on NURBS | Passed | no notice, scene changed |
| S2.5 | No errors | Passed | none |
| S3.1 | Figure export with refused + good Preset refused up front | Passed | notice names s72-bad17 |
| S3.2 | No download | Passed | 0 downloads |
| S3.3 | Live scene unchanged | Passed | select s72-good, snapshot identical |
| S3.4 | No errors | Passed | none |

## Gaps

- De Boor route not tried for the degree-1 Preset (NURBS only).
- Blossom scene compared by SVG ellipse positions and labels, not pixels.
- Pan unverified (above). Chromium only; no screenshots taken.
- Cleanup: each scenario used its own temporary context (localStorage discarded); no node/chromium processes left running.
