# Task 11 browser smoke

Run 2026-10-29 07:54–08:03 UTC. Target: production preview `http://127.0.0.1:4391/bezeg-2.0/` (HTTP 200, title `Bezeg`), Chromium via Playwright 1.64.0; desktop default 1280×720, manual 1280×800, responsive checks at 390 px and short landscape. Checkout HEAD `12ca8f5`, dirty task tree. Handler supplied current-build provenance (build logs timestamped 07:49:48 and 07:53:17 UTC); live asset fingerprint: HTML SHA-256 `6cdf42e70bdf9a63ab881c2e3b913a2bd6edf440050836ed320046a9db8fc417`, JS `index-BHukIcQi.js` SHA-256 `8a8e8b3938c10806e2f21092a59e88202eff4af25e49fda7f5c5939b0cdb7713`, CSS `index-3PxAN9kg.css` SHA-256 `e4575c48cd4045b8fb53cea20ebc4d98c7b2db4fb8614756fd58e90eab739a05`.

| Workflow | Result and evidence |
|---|---|
| Entry and graph families | **Passed** — 66-test batch included every catalog route; all rendered heading, board, and inspector. |
| Point and slider response | **Passed** — polynomial drag moved p0 from `(-4,-3)` to `(-3.545,-2.659)` and changed the curve; De Casteljau `t` changed `0.5→0.8` after lesson completion and changed rendered geometry. |
| Rational and PH controls | **Passed** — Farin weight interaction retained the expected rational curve; PH child-board drag changed its point and main curve. |
| Navigation lifecycle | **Passed** — polynomial↔PH navigation twice returned to one main board; PH selection mounted and disposed its auxiliary board. |
| Language and presets | **Passed** — SL→EN→SL retained edited geometry and selection; unique `smoke-1793260973635` preset saved, changed, reopened with matching geometry, then deleted. |
| Lesson return, completion, focus | **Passed** — 22 selected tests: 7 exit/re-entry, 9 shared-runtime, 3 observation, and 3 board ownership/navigation tests; chapter return at frame 2 restored reading position and invocation focus through Back/Forward; completed graph accepted an actual parameter edit. |
| Narrow viewport and keyboard | **Passed** — 3 lesson graph tests plus 4 chapter tests covered 390 px, enlarged text, Presentation/touch, Tab+Enter, and visible focus. |

Playwright batches: 22/22 (`guided-lessons.smoke.spec.cjs` and selected `curve-ownership.smoke.spec.cjs` rows); 66/66 (`demonstrations`, `workflows`, `curve-editing-modes`); 3/3 (`lesson-graph-access`); 4/4 (`standalone-learning`/rational weight). Custom scripts: `.claude/scratch/t11-codex-smoke/{completion-edit,polynomial-drag,unique-preset}.cjs`; config `playwright.config.cjs`. No runtime errors. The first drag invocation used the wrong locale selector and was corrected; retry passed. All browser contexts closed; temporary preset deleted; handler-owned preview left running. Skipped the full lesson-content corpus walk because task 13 has not authored the patch chapter; existing lessons cover the shared runtime. Physical-device use and GitHub Pages hosting remain unverified.
