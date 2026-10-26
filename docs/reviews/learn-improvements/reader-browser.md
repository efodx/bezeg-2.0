# Shared reader browser evidence

Run on 2026-10-26 against the handler-owned production preview at `http://127.0.0.1:4387/bezeg-2.0` (HTTP 200). The checkout was `3c96183758b4325dbd10df81cd61c99fc2cbf4ca`, dirty with the reader changes listed in the handoff. The supplied preview was built from that dirty checkout. Focused Chromium checks took about six minutes including setup.

| Check | Status | Evidence |
| --- | --- | --- |
| Unified learning smoke suite | Passed | `just smoke-built tests/unified-learning.smoke.spec.cjs --port 4388 --workers=2`: 9/9 passed, including all eight chapter deep links, refresh, contents activation, translation, no-board/math-error checks and mobile disclosure. Runner used its separate production preview and disposed it. |
| Bezier and Foundations layout | Passed | Chromium at 1440×900, 1024×768, 390×844, with 100% and 200% root text: no document overflow; body measure was 70ch at wide 100% and headings rendered at 42.4px/32.8px/30.4px respectively. Long formulas scrolled inside labeled regions; no board or MathJax errors appeared. Visible keyboard focus had a 3px outline. |
| Active section while scrolling | Passed | Both readers selected the section crossing the reading threshold. URL and history length stayed unchanged. |
| Deep links, language, browser history | Passed | Deep hash survived refresh in both readers. Contents labels changed between “Vsebina poglavja” and “Chapter contents.” Back/Forward restored the selected section. |
| Contents access | Passed | Bézier mobile contents at 390px/200% text scrolled internally to its final item (614px of 1135px), then closed and focused the selected heading. At 1440×360, desktop contents scrolled to and activated the final item. |
| Bézier parameter activity return | Passed | The De Casteljau board mounted with three sliders; the parameter changed from 0.50 to 0.51. Enter on “Continue reading” returned to the original reader URL, restored focus to `activity-curve-parameter` and the `parameter` section, and left no board mounted. |
| Console/runtime errors | Passed | No console errors or uncaught page errors. Browser context closed; no saved data was created. The supplied 4387 preview was left running as requested. |

Screenshots: [desktop, 1440×900](reader-browser-desktop.png), [mobile, 390×844](reader-browser-mobile.png), [mobile contents open at 200% text](reader-browser-mobile-contents.png), and [short desktop contents](reader-browser-short-desktop.png). The 100% mobile list fits without internal scrolling; enlarged text makes the bounded scroll behavior observable.

Coverage was limited to live Bézier and Foundations reader behavior, plus the 9-test suite. Physical devices, exhaustive accessibility, the remaining chapter layouts beyond automated route checks, and observer disposal were not independently tested.

Handler follow-up: removed the redundant family label above the Bézier heading, rebuilt successfully (`.command-logs/2026-10-26T00-03-25-761Z-88204-a68b0ec0.log`) and passed all 11 targeted checks: all eight chapter production deep-link/refresh/language/mobile rows, unknown chapter/section recovery, enlarged-text Bézier reading, and keyboard activity entry/return (`.command-logs/2026-10-26T00-03-48-711Z-102764-c2ca0e76.log`). Final header captures at [1440px](reader-header-1440.png) and [390px](reader-header-390.png) confirm the label is absent and neither page overflows; handler reviewed the rendered result. The earlier screenshots retain evidence for the broader matrix and contents interactions.

The previous deployment's failure was a stale heading expectation in the recovery test, reproduced locally before changing its locator to the stable topic-heading ID. The existing narrow-reader smoke likewise expected a button replaced by the native disclosure; that failure was reproduced before changing its selector to `summary`. Both cases passed after correction; no recovery behavior was changed. Raw reproduction log: `.command-logs/2026-10-25T23-58-32-251Z-97148-1484f79c.log`. Focused test lint passed.
