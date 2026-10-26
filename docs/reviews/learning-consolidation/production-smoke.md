# Production browser smoke — learning consolidation

Date: 2026-10-26. Elapsed: about 8 minutes including setup.

The run used the handler-owned production preview at `http://127.0.0.1:4397/bezeg-2.0/`, served from the frozen checkout. Build provenance was supplied as `.command-logs/2026-10-26T12-02-23-066Z-86024-a19c7fe8.log`. The checkout was `codex/consolidated-learning`, HEAD `dd7c414f6d19b6fb66e8339753a7a8d6fb0e07a9`; it was already dirty across application, test, and documentation files. This smoke run changed no application source. The report and screenshots are the only durable smoke artifacts.

Browser: headless Chromium through Playwright 1.64.0 on Windows. Desktop viewport was 1440×1000 CSS px. Narrow and enlarged-text checks used 390×844 CSS px and 200% root text size. Browser console and page-error listeners were active throughout; none fired.

| Check | Status | Concrete evidence |
| --- | --- | --- |
| Home, catalog, and desktop presentation | Passed | English home headline and starting carousel rendered; catalog showed 45 cards. Screenshots: `production-smoke-shots/home-desktop.png`, `catalog-desktop.png`. |
| Polynomial, rational, spline, and PH boards | Passed | `/bezier/curve`, `/rational/base`, `/spline/c1spline`, and `/ph/cubic` each showed its expected heading, inspector, and visible curve (1 each); visible point counts were 4, 4, 9, and 4. |
| Bézier point drag and de Casteljau parameter | Passed | On `/bezier/decasteljau`, a real pointer drag moved the control point from `(-4, -3)` to about `(-3.576, -2.697)` and changed the curve SVG path. Focusing the parameter range and pressing ArrowRight changed `t` from `0.50` to `0.51`; visible construction-point coordinates changed. |
| Rational weight | Passed | On `/rational/base`, clicking “Increase weight” changed the curve path. |
| PH auxiliary editor | Passed | Selecting the PH curve mounted the hodograph board. Editing `w1 x` changed it from `-2.6` to `-2.3`. |
| Short chapter example, midway return | Passed | Advanced to frame 2 of 2, then returned to the invoking section. Focus returned to its link and its relative reading position matched before entry (difference <1 px). Screenshot: `production-smoke-shots/chapter-return-desktop.png`. |
| Authored multi-frame chapter example | Passed | In Foundations, progress advanced from frame 1 to frame 2 of a five-step example; Return to chapter restored the owning section and invoking-link focus. |
| Completion, editing, and Continue | Passed | Completed the control-points example, edited the graph’s first x coordinate to `-5`, and used Continue in chapter; the owning section returned. |
| Catalog guidance and free exploration | Passed | The Bézier catalog guidance link opened a chapter-owned guided example with its owner context. Opening `/bezier/curve` directly showed a graph without a lesson panel. |
| Canonical and legacy entry, refresh, history | Passed | Chapter entry opened `?example=activity.bezier-curves.parameter.decasteljau`; refresh preserved the panel. Back returned to the chapter and Forward restored the example. Direct `?learn=1` normalized to `?learn=1&learnChapter=bezier-curves&learnSection=interpolation`; refresh retained it. |
| Language retains edited selection | Passed | Dragged a Bézier control point, selected its curve, switched EN → SL → EN, and confirmed point coordinates and curve drawing persisted. |
| Narrow keyboard and enlarged text | Passed | At 390×844 and 200% root text, the lesson panel fit within the viewport (x=22, width=346), document horizontal overflow was absent, and Enter on the focused Next action advanced the frame. Screenshot: `production-smoke-shots/lesson-390px-200pct.png`. |
| Hide, reopen, exit, and animation cancellation | Passed | Taylor lesson hide/reopen retained its frame; Exit restored the entry degree value 7. On animated de Casteljau, playback moved `t` from 0.50 to 0.53, reopening paused it at 0.55, and Exit restored the entry checkpoint `t=0.50`; it remained stable for 450 ms after exit. |
| Console and page errors | Passed | No `console.error` or uncaught page error observed. |

The desktop home, chapter-return, and 390×844/200% screenshots were opened and visually inspected. Their visible content stayed within the captured viewport; the narrow lesson panel and controls remained readable. Other saved captures are `production-smoke-shots/final-desktop.png`.

The browser context and Chromium process created by this run were closed. Checks used a fresh isolated browser context; no preset or persistent user data was created. The assigned preview was reused and left running for its owner. No browser, device, or hosted GitHub Pages behavior beyond this local production preview was tested.
