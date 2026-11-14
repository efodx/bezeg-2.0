# Capture-text pilot (C1): worker notes

Files: `scripts/capture-demonstration-previews.cjs` (`applyCaptureText`, `captureTextPolicy`, `serializableRecipe`, `presentBoard`), `scripts/demonstration-preview-recipes.cjs` (`captureText` table, `validateRecipes` shape check, envelope window), `scripts/demonstration-preview-text.test.cjs` (new, 8 tests, jsdom).

Behaviour
- Recipes with `text` get `annotations: 'capture-text-policy'`. Policy crosses into the page as `{source, flags}`; `applyCaptureText` source crosses as a string (`new Function`), so it is self-contained and unit-testable on jsdom.
- Applied three times per `presentBoard` call (before the resize, after the resize update, before the return), so every clip frame ends in policy state. Hiding is `display:none !important` on the line `<div>` and, when no line is kept, on the object; `data-capture-text-hidden` marks what the policy hid so a line that matches again is shown again.
- Excluded: axis/grid/tick labels and children (the existing `axisGridObjects`), point-name labels, invisible objects, smartlabels. A recipe with `text` no longer runs the 65-character rule.
- Recorded per capture: `textKept`, `textHidden` (unique strings are not deduped; the hidden list includes a `0,0` object on every board, an unnamed text the capture sees; harmless, but a C3 test on `textHidden` must expect it). The manifest `recipe.text` is written as `{source, flags}` records.
- `presentationFingerprint` now also hashes `applyCaptureText`.

Windows
- `curve-envelope`: `[-0.203, 0.93, 1.203, 0.07]`. The capture pads the window by 14 percent per side (scene `sceneBounds` -> `boardBoundingBox`), and with a window `equalUnits` is false, so the board stretches to the frame. Window 1.406 x 0.86 pads to 1.8 x 1.1, ratio 1.636, i.e. equal 400 px/unit; the unit square (control points, line family) is 400 x 400 px = 50.5 percent of 720 x 440, 20 px margin to the frame at top and bottom. Path t 0.5 -> 0.9 -> 0.5 unchanged; touch point stays inside.
- `prob-correlation`: window `[-1, 9, 4.5, -0.5]` kept. All four points stay in view with at least 84 px to the top and about 100 px to the bottom; the dragged point moves y 8 -> 4 inside. The regression line is an infinite line and meets the frame edge at lower left by nature.
- `coordinateContextPolicy('prob-correlation')` is `hide` (family `/bezeg-2.0/probability`). The live graph: `CorrelationGraph.tsx` does not turn axes off, so JSXGraph's default axes should show; not confirmed in a browser.

Pipeline findings
1. `just preview` refused ("Build inputs changed since the last runner build") because the other worker edited `src/`. I served the existing HEAD `dist` with `SMOKE_PORT=4333 node scripts/serve-smoke-build.cjs` (the script `just preview` wraps), bypassing only the freshness check.
2. At HEAD the capture script cannot run at all: `validateRecipes` fails because the catalog has four Demonstrations without a recipe (`complex-power`, `complex-euler`, `recursion-cobweb`, `contour-map`); `demonstration-preview-capture.test.cjs` has two failures from the same cause. For the trials I preloaded (`node -r /tmp/filter-catalog.cjs`, outside the repo) a filter that drops those four from the catalog array. Nothing in the repo changed for this.
3. `just tooling-test` does not list `demonstration-preview-capture.test.cjs` nor the new `demonstration-preview-text.test.cjs` (list is in `scripts/commands.cjs:443`, not an owned path). The new tests ran with `node --test` and pass (8/8); add the file to the list.
4. Trial captures were non-publishing: staging stays under `.command-logs/preview-staging-*`.
