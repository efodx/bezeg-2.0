# Splines browser check

The scoped production-preview browser checks passed on 2026-10-26. They exercised the assigned build at `http://127.0.0.1:4396/bezeg-2.0`, owned by the handler, with Playwright Chromium headless. The handler identified build revision `b6b0bb6`; at dispatch the checkout already had dirty Splines chapter/test files, `docs/reviews/learn-improvements/splines-worker.md`, and `docs/tasks/learn-improvements/`. No application files were edited by this check. Elapsed time was about 6 minutes 12 seconds.

| Check | Result and evidence |
| --- | --- |
| Slovenian deep link, refresh, worked join, and reader isolation | Passed. `/learn/splines#worked-join` retained its hash through language selection and refresh. Worked-join MathJax rendered 78 containers with zero MathJax errors. The reader mounted no graph board. |
| Bilingual prompts and figures | Passed. All 11 spline prompt occurrences had nonempty text and guided-lesson links; English copy changed at every occurrence. Both figures decoded at 720×440, had alt text and captions with rendered math, and stayed within their containers. |
| English responsive reader | Passed at 1440, 1024, and 390 CSS pixels, plus 390 pixels with root text at 200%. Document width matched the viewport at every size; figures were not cropped and no reader board mounted. |
| General spline controls | Passed. After explicitly exiting the linked lesson and restoring the graph, continuity changed 1→0 and degree 2→3. Live JSXGraph paths had finite samples and changed by maximum sampled distances 1.556 and 0.458 respectively. |
| G1 parameter | Passed. After exiting the linked lesson and restoring the graph, the `Parameter b 1` spinbutton showed 1, then accepted 0.65. The finite live path changed by maximum sampled distance 0.368. |
| Rational reader baseline | Passed. `/learn/rational-curves#worked-conic` retained two decoded 720×440 figures, no MathJax errors, and no graph board. |
| Browser errors | Passed. No page errors or console errors were observed. |

One control detail is worth tracking: the G1 spinbutton showed the exact model value `1`, while the browser-normalized native range input reported `0.9967` at the default step. The smoke changed the exact spinbutton value to `0.65` and verified the graph response. It did not claim that a pointer drag on the range can select that exact decimal.

Focused captures and raw results are in the ignored `.command-logs/` directory: `splines-browser-sl-worked-join-1440.png`, `splines-browser-en-desktop-1440.png`, `splines-browser-en-figures-c1.png`, `splines-browser-en-figures-g1.png`, `splines-browser-en-narrow-390.png`, `splines-browser-en-narrow-390-200.png`, `splines-browser-en-prompt-general.png`, `splines-browser-en-prompt-g1.png`, `splines-browser-cn-controls-live-geometry.png`, `splines-browser-g1-b065-live-geometry.png`, and `splines-browser.json`.

The isolated headless browser was closed after capture; the handler-owned preview was left running. This check does not cover physical devices, free-control-point dragging, mathematical proof, full application tests, or hosted GitHub Pages behavior.
