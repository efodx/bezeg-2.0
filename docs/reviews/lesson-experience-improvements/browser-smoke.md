# Browser smoke

Target: http://127.0.0.1:4390/bezeg-2.0 (handler-owned local production preview). Checkout C:\Users\1337Hacker\Desktop\bezeg-2.0, HEAD 42c7d88e767726b2fac5063fbaa3e5766b5cd80f; dirty lesson/runtime/docs/localization changes and debug.log were preserved. Preview build provenance: [build log](../../../.command-logs/2026-10-21T17-34-51-681Z-53088-f55e59f3.log). The handler made a later Taylor prose-only edit; it is rebuilding and refreshing Taylor evidence. This run took about 9 minutes. Playwright 1.64 Chromium, headless, isolated storage; desktop 1440×1000, narrow 390×844, 150% CSS zoom simulation at 1024×768, projection 1920×1080.

| Check | Status | Observed evidence |
|---|---|---|
| Bézier pointer drag | Passed | jxgBoard1P23 moved from [-4,-3] to [-3.636,-2.727]; curve SVG path changed. |
| Edited scene across SL→EN→SL | Passed | p0=[0.75,-0.35], selected curve, and curve geometry persisted. |
| De Casteljau, rational weight, PH editor, temporary preset | Skipped | Handler’s concurrent automated suite covers these workflows; manual selectors initially mismatched the current language/control reveal. |
| Repeated family navigation | Skipped | Picker uses topic/card buttons; my first locator expected route links. No app failure was established. |
| Taylor lesson in English | Passed | Hide/edit/reopen kept “Step 1 of 7 · Frame 1 of 3” and the board view; degree changed to 9 in exploration. Observation Continue hit-tested to a button and advanced to Step 2. Escape canceled exit; confirmed exit restored degree 7, visible bound, bounding box, and 50 board objects. |
| Short lesson and chapter return | Passed | Bézier lesson completed in English after 14 frame visits. Chapter activity “Continue reading” returned to /learn/bezier-curves with its heading. |
| Viewports and presentation | Passed | Four captures below; narrow page width was 390px at 390px. Presentation class activated. Projection capture shows the app header links pale on near-white buttons; contrast was not measured. |

Captures show the ordinary Slovenian Bézier workspace, not Taylor reading layouts: [desktop](graph-desktop.png), [narrow](graph-narrow.png), [enlarged](graph-enlarged.png), [projection](graph-projection.png). Existing baseline captures remain untouched. Runtime/page errors: none. Browser contexts were closed; isolated temporary state was discarded. Physical touch/projector behavior, keyboard workflows, and learner evidence were not tested.

Handler follow-up: the final Taylor wording was rebuilt and its production browser checks passed, including all Taylor rows, graph-access round trips, responsive/keyboard matrix, and the observation flows. Actual Taylor reading screenshots are linked in [implementation evidence](implementation.md#final-verification); they supersede these graph captures for reading-layout acceptance. The automated suite separately exercises the keyboard, rational/PH, preset, and navigation checks skipped in this manual run.
