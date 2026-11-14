# Analytic lines F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter analytic-lines`, four entries; `expected` authored from the first scenes in `analyticLinesGuidedLessons.ts` and the build code of `LineGeometryGraph.tsx` (`analyticLinesExpectedFor`); the capture accepted all four on the first run. The adapter repeats the prepared-scene action, so one or two open each scene.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the analytic-lines example cards ..." failed with ENOENT on `src/images/learning/examples/analytic-lines/manifest.json`; passes after capture. `functionsCards` counts use `types.point`, so angle-between-lines is [1, 5] (the crossing marker X counts).
- Recipe `line-geometry` added (window [-7, 6.5, 8.5, -3.1]); it leaves the exhaustive-recipe test's missing list (that test still fails for other ids, pre-existing).
- Frames viewed: forms one green line, two dots; normal green and horizontal blue lines, arrows n1 and n2; angle two lines, arc with value, u/v labels overlapping the line labels; distance PT dashed, foot arrow, corner mark, d value.
- Alt text uses plain letters (no `\ell` in alt: mathAltText rejects backslashes) and states no first-step answer; the images do show the angle and d values.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/analytic-lines/`.

## Label pass (handler 20)

- `LineGeometryGraph.tsx` `labelBoxes()` places every board text (names of the lines, n1/n2, u/v, the angle value, PT, PTn, d) by the bounded candidate search `placeLpLabels` (imported from `src/graphs/levelsets/lpLabelLayout.ts`, unchanged): clear of handles, foot and crossing markers, arrow heads, the drawn lines, the arc and each other. No new locale keys; texts and ids unchanged.
- Defects before/after: u and v no longer sit on the names (angle card); d value, PT and PTn clear of the arrow and the dashed segment, l clear of the right-angle mark (distance card); l beside the line between the handles (forms card); n1 sits at its own arrow (normal card).
- Test `src/graphs/lines/LineGeometryLabels.test.tsx`: seven scenes (the four card openings and three more); red before the fix (6 of 7 failed: l on a line or marker, v on a line, PT on a marker), green after.
- Not changed: the handle name labels (P, Q, T, F) and axis tick numbers are not obstacles; at 390 px a name can touch a tick number. The inventory `expected` checks pass unchanged. Logs: `.command-logs/label-pass/analytic-lines/`.
