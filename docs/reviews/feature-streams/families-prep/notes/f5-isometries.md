# Isometries F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter isometries`, three entries; `expected` authored from the first scenes in `isometriesGuidedLessons.ts` and the build code of `IsometryGraph.tsx` (`isometriesExpectedFor`: lines, curves, points, segments; texts unasserted); the capture accepted all three on the first run.
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the isometries example cards ..." failed with ENOENT on `src/images/learning/examples/isometries/manifest.json` (PNG directory moved aside); passes with the PNGs. Counts use `types.point`: two-mirrors [3, 5] includes the rotation centre cross.
- Recipe `isometries` added (window [-4.4, 5.6, 10.9, -3.9]; a first wider window left the figure small); it leaves the exhaustive-recipe test's missing list if that test lists it.
- Frames viewed: two-mirrors horizontal grey and blue dashed mirrors crossing at the orange centre cross, motif above, grey dashed image below, blue image upper left; classifying one oblique mirror with orange axis on it, motif and thick grey image overlapping, slika 1 label touches the diamond; dilation small dark triangle inside larger green one with dashed rays, centre circle and blue ratio diamond, label središče touches the diamond.
- Alt text uses plain words and quotes the Slovenian graph labels; none states a first-step answer.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/isometries/`.

## Label pass (handler 20)

- Every caption of `IsometryGraph.tsx` (mirror, image, motif, centre, axis, vector, ratio, rosette, frieze names) is placed by `placeLpLabels` (`labelBoxes`, cached per state, handles and 1 px layout key): the anchors are the handle, the polygon corners or points along the mirror or axis; the handles, markers, mirror lines, axis and curves are obstacles, and the handle names are placed like the other texts. Hidden-text and tick numbers are not placed.
- Cards recaptured (two-mirrors, classifying, dilation): "slika 1", "središče", "lik" and "os" no longer touch a handle, a line or each other. Remaining: "središče" sits some 45-150 px from its marker where the figure leaves no room beside it (colour ties it); on the 390 px classify opening "lik" still crosses the overlapping image triangle.
- Test `IsometryLabels.test.tsx` (nine scenes): red before (all nine, e.g. "slika 1" on a line, "lik" on a marker), green after. Logs `.command-logs/label-pass/isometries/`.
