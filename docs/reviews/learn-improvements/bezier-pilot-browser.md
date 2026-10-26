# Bézier teaching pilot browser evidence

Run on 2026-10-26 against the handler-owned production preview at `http://127.0.0.1:4390/bezeg-2.0/learn/bezier-curves`. The supplied checkout was `1a03914` with the Bézier chapter source and spec dirty; review and task files were also present. The handler confirmed the preview was HTTP 200 and that its build matched the dirty checkout. I used the ChatGPT in-app browser; the exact viewport was not recorded.

| Check | Status and evidence |
| --- | --- |
| Production preview | **Passed.** The preview loaded the Bezeg home page and the Bézier chapter. |
| Teaching sequence and translations | **Passed.** The rendered accessibility tree showed the same eight section IDs in Slovenian and English. In both, the parameter section names its five-control, degree-four example; the next section derives the three-control quadratic before the five-control quartic activity and explains the bridge between them. The linear interpolation and quadratic formulas rendered in both languages. The reader exposed no graph board in its accessibility tree. |
| Authored activities and browser suite | **Passed.** The handler ran `tests/standalone-learning.smoke.spec.cjs` against the matching production build outside the sandbox: 18/18 passed in 37.1 seconds. Coverage includes all six activity routes and authored scenes, the parameter slider’s `t=0.50` to `t=0.75` construction update, activity return focus/history on sampled routes, and 390-pixel / 200% reading checks. |
| Remaining changed-control checks | **Skipped.** The suite verified the Bernstein scene starts at degree two and affine translation updates the four control points. It did not verify the degree-two-to-three basis-count change, a rotation or scale after translation, or same-map evidence for either transform. I did not repeat those controls. |
| Settled keyboard return and screenshots | **Skipped.** I did not run the additional natural Tab+Enter return-offset check or save the requested desktop/narrow captures. The existing suite covers activity return URLs and focus, but not the settled viewport offset. |
| Runtime and cleanup | **Passed with limits.** The suite’s runtime-error checks passed. Restricted shell networking blocked my in-sandbox loopback probe; the handler completed the suite outside the sandbox. I stopped my duplicate port-4391 run with Ctrl+C. The handler-owned port-4390 preview remains running. No app files were changed. |

Physical-device behavior and comprehensive accessibility were not tested.

## Final Task 5 browser acceptance follow-up

Run on 2026-10-26 against the handler-owned local production preview http://127.0.0.1:4393/bezeg-2.0. Checkout HEAD was 3252f3b with the assigned Bézier chapter and spec dirty; review notes and the local task plan were also present. Browser: Playwright Chromium, headless, isolated context. The final checks took about eight minutes, including setup. The supplied preview remains running.

| Check | Status and evidence |
| --- | --- |
| Interpolation flow, translated reader, and 200% text | **Passed.** At 1440px and 390px, both Slovenian and English rendered the interpolation formulas and repeated-interpolation caption math. Figures decoded, no graph board mounted, and document/body widths matched the viewport. The four full-section captures are task5-interpolation-desktop-200-sl.png, task5-interpolation-desktop-200-en.png, task5-interpolation-narrow-200-sl.png, and task5-interpolation-narrow-200-en.png under .command-logs/. |
| Viewport legibility | **Passed.** Saved task5-interpolation-card-desktop-100-en.png, task5-interpolation-card-narrow-100-sl.png, and task5-interpolation-card-narrow-200-en.png. Handler visually reviewed these and the desktop/narrow full-section captures; figure and caption were coherent and uncropped. |
| Bernstein degree control | **Passed.** The UI showed degree 2 with three live basis curves; increasing to degree 3 produced four. Live samples were finite and summed to one at the endpoints and midpoint. Evidence: .command-logs/task5-bernstein-evidence.json. |
| Affine map | **Passed.** Right translation moved all four live controls and curve samples by (0.5, 0). Scale-up then mapped them by factor 1.2 about the translated control bounding-box center (0.5, 0). |
| Settled keyboard return | **Passed.** Retained .command-logs/capture-return-repro.cjs: natural Tab focused #activity-curve-parameter; Enter launched the activity; Enter on Continue reading restored focus to that link. After smooth scrolling settled, the section top was -632.25px and scrollY was 3012 before and after. Zero page errors. |
| Runtime and cleanup | **Passed.** No browser console/page errors in the direct checks. Isolated browser contexts closed; no app files changed. .command-logs/ captures/scripts are ignored. Handler-owned port 4393 was not stopped. |

The first affine attempt used an English exact accessible name while the fresh context remained in Slovenian, so the selector timed out; the locale-independent retry above exercised the visible controls and passed. The prior 18/18 standalone-learning suite remains accepted evidence and was not repeated. Physical-device and comprehensive accessibility checks remain outside this run.


