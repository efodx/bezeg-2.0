# Rational curves browser acceptance

Tested `http://127.0.0.1:4396/bezeg-2.0/learn/rational-curves#worked-conic` against the handler-owned production preview. Browser: Chromium 156.0.8078.4. Checkout: `4d509b9`; dirty files at capture were `docs/specs/learn-improvements.md`, `src/learning/content/familyChapters.ts`, `src/learning/content/familyChapters.test.ts`, `docs/reviews/learn-improvements/rational-review.md`, `docs/reviews/learn-improvements/rational-worker.md`, and `docs/tasks/learn-improvements/`. The handler's final build log is `.command-logs/2026-10-26T01-26-39-923Z-14628-2bd796a8.log`. Run time: 5m 48s including setup.

| Check | Result and evidence |
|---|---|
| SL/EN reader, refresh, figures | Passed. Deep link survived refresh and language switch. Both 720×440 figures and caption math loaded; no reader boards or MathJax errors. |
| Layout | Passed at 1440, 1024, and 390 CSS pixels; also 390 pixels with root text at 200%. No page overflow or image cropping. |
| Updated prompts | Passed. Weight prompt names Previous/Next weight and value/increase/decrease controls. De Casteljau prompt names endpoint \(R(t)\) of the growing curve prefix and avoids invisible homogeneous levels. |
| Live relative weight | Passed. Curve 1's \(w_1\) changed from 2 to 4. Eight live samples matched independently evaluated weighted Bernstein coordinates; all four control points stayed fixed. At \(t=1/3\), distance to \(P_1=(-3,3)\) fell from 1.6500 to 1.0214. |
| Circle count | Passed. Changing 3 to 4 produced four sampled arcs (101 samples each), all on radius 3, cyclically joined, with total sweep \(2\pi\). |
| Runtime errors | Passed. No page or console errors. |

Captures and full numeric samples: `.command-logs/rational-browser.json`, `rational-browser-{sl,en}-conic-*.png`, `rational-browser-en-narrow-200-prompt.png`, `rational-browser-weight-curve1-w1-4.png`, and `rational-browser-circle-4-pieces.png`. The isolated browser closed cleanly; no preset or persistent data was created. The handler's preview remains running. This run covered the two repaired prompts and representative weight/circle interactions; the other Rational operation prompts were outside this targeted browser pass.
