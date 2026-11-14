# Level sets F5: example card image (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter level-sets`, one entry; `expected` authored from the LS5 first scene (the Demonstration default, no `levelsets` action) and `LinearProgramGraph.tsx` / `lpScene.ts` (viewBox 10, clip square 30): 6 curves (region, two constraint lines, dashed sweep k = 9, objective line at 12, walk) and 6 points (four vertices, optimum square, handle (3, 2)); line samples computed by hand.
- Recipe row `linear-program` added (leaves the exhaustive-recipe missing list; that test still fails for other ids). `levelSetsWindows` [-9.72, 15.64, 13.72, 1.131].
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the level-sets example cards ..." ENOENT on `src/images/learning/examples/level-sets/manifest.json` (`f5-prepng.log`). After capture the cached glob was stale ("expected undefined to be truthy", plus mathAltText); a real edit to the comment above `chapterImageUrls` refreshed it; green.
- Frame viewed: first capture without a window showed a 120-unit view, region a dot under the legend (rejected). Final: region as a small quadrilateral under the legend at the axes' crossing, handle and "Cilj (3; 2)" label, dashed and thick lines.
- Board labels touching: "(0; 4)" touches the y axis and the lower edge of the legend; "(2; 3)" touches the optimum square and the thick and dashed lines; "(0; 0)" and "(3; 0)" sit on the x axis and the walk; handle "Cilj (3; 2)" lies one unit from the (2; 3) vertex and the arrow overlaps the walk; long constraint, sweep and objective lines and the axis ticks run through the legend text. The constraint labels "Pogoj 1/2" lie outside the window.
- Board readout showing the answer of step 1: yes, all four vertex coordinate labels are drawn on the board in the first frame (step 1 asks the learner to predict the vertices); the card copy omits them. Host/graph matter, not changed.
- Not fixable in owned paths: legend of eight rows covers the top two thirds of the 420x260 frame, so the figure cannot fill the card at equal units (28 px per unit).
- F3 status in the task file was not stale (chapter, lesson and registry exist); its claim unchanged.
- Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/level-sets/`.

## Label pass (handler 20)

- Board legend: eight rows became four merged rows (`boardLegend`, new keys `levelsets_graph_lp_capb_*`) plus the clip row, a pixel-anchored stack with a faint backdrop; tick numbers under it are not written (`defaultAxesAttributes`); the panel list keeps the eight full rows and every `data-legend` id. Opening frame and legend band follow the shorter stack.
- Texts: vertex coordinates, the handle caption and the constraint names are placed by a bounded candidate search (`lpLabelLayout.ts`) that avoids markers, drawn lines, the axes' number strips, the legend and each other; a constraint name sits on the visible part of its line (was off the window).
- Card window `levelSetsWindows` now [-3.5, 7.77, 10.5, -0.9]: the region fills the plot below the legend. Recaptured; viewed. Placement tests in `LinearProgramLabels.test.tsx` (red: `legendBox`/`labelBoxes` missing at HEAD, `red.log`; then green).
- `levelSetsPresetFile.test.tsx`: the linear program no longer wraps a legend row at 390 px, so its wrap expectation was limited to the contour map.
- Not verified: the legend backdrop hides, not removes, lines under the text; presets with positive-slope lines through the stack still pass beneath it. Logs `.command-logs/label-pass/level-sets/`.
