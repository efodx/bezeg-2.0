# F3 trig Batch C (TR5) slice 1

## Written
- `src/learning/model.ts`: `triangle` union gains `set-data` (type, optional a, b, c, angleA, angleB) and its comment.
- `src/graphs/trig/TriangleSolverGraph.tsx` `applyTriangleAction`: `case "set-data"`. The chooser loads `DEFAULT_SOLVE_DATA[type]` (even for the same type), so omitted fields take the type's defaults, given fields replace them. Wrong-type or unknown fields throw via `refuseUnknown`; values are checked by `parseTriangleState` (nothing snapped); one `setState`; mode unchanged.
- Host tests added in `TriangleSolverLessonActions.host.test.tsx` (equal to chooser + typed fields for four types, chooser alone, sync sequence, checkpoint restore, invalid values).
- Evidence in `.command-logs/trig-c/`: host-red.log (8 failed), host.log, s1-unit.log, s1-tsc.log, s1-lint.log (all green), probe.txt (sl + en).

## Observed
See probe.txt. Status text states the count on the first frame (see Probe summary).

## Probe summary
- Defaults: SSS 5,6,7 gives A 44.4153, B 57.1217, C 78.463, area 14.69694; SAS gives a 6.245, B 43.8979, C 76.1021, area 15.15544; ASA gives a 5.22163, b 7.03508, area 18.08825. Rows: sides, angles, area per solution, plus "Height h" for SSA. No cosine/sine-rule step is shown.
- Status shown at once: SSA a=5 "Two solutions (B1 solid c about 9.9282, B2 dashed c about 3.9282)"; a=4 "One solution ... right angle at B"; a=3.5 "No such triangle: a shorter than h about 4"; a=8, 9 "One solution: ray and arc meet in one point"; a=6, 7.75 two solutions. So step 1, 5, 6 predictions are all answered by the status line on the first frame.
- Height h is a readout row (about 4) and a dashed drawn segment; legend: solid circle about C radius a, dashed height h. B1 solid / B2 dashed, labels B1, B2.
- Impossible: SSS 2,3,6 "sum of two sides must exceed the third"; 3,3,6 "flat triangle"; ASA 100,80 and 120,70 "angle sum at least 180"; no rows, nothing drawn, no legend.
- Board refits to the solved drawing (extent padded by 1). SSA a=3.5 still draws ray, circle and h but no triangle. Reset (lessonDefaultState) goes to mode sides with SSS 5,6,7.

## Doubts
- The Reset button was not found in a plain mount, so reset from solve mode is read from code, not exercised.
- Board bounding boxes are from jsdom dimensions, not a real browser; not smoke tested.
