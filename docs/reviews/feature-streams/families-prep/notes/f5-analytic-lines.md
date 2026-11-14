# Analytic lines F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter analytic-lines`, four entries; `expected` authored from the first scenes in `analyticLinesGuidedLessons.ts` and the build code of `LineGeometryGraph.tsx` (`analyticLinesExpectedFor`); the capture accepted all four on the first run. The adapter repeats the prepared-scene action, so one or two open each scene.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the analytic-lines example cards ..." failed with ENOENT on `src/images/learning/examples/analytic-lines/manifest.json`; passes after capture. `functionsCards` counts use `types.point`, so angle-between-lines is [1, 5] (the crossing marker X counts).
- Recipe `line-geometry` added (window [-7, 6.5, 8.5, -3.1]); it leaves the exhaustive-recipe test's missing list (that test still fails for other ids, pre-existing).
- Frames viewed: forms one green line, two dots; normal green and horizontal blue lines, arrows n1 and n2; angle two lines, arc with value, u/v labels overlapping the line labels; distance PT dashed, foot arrow, corner mark, d value.
- Alt text uses plain letters (no `\ell` in alt: mathAltText rejects backslashes) and states no first-step answer; the images do show the angle and d values.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/analytic-lines/`.
