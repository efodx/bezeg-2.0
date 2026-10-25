# Unified learning browser smoke

Date: 2026-10-25. Checkout: `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg`, HEAD `6157b04cebb7b0f54685bd6b691d4cca21138108`, dirty working tree as assigned. The handler-owned local production preview at `http://127.0.0.1:4390/bezeg-2.0` answered HTTP 200. Playwright smoke runners started their own production previews on isolated ports 4394 and 4395. Build provenance was `just build` log `.command-logs/2026-10-25T22-25-05-604Z-77316-e75a95b9.log`.

## Final-build checks

| Check | Status | Evidence |
| --- | --- | --- |
| Learn index and lesson entry | Passed | Fresh preview showed 8 unique chapter routes and 45 guided-lesson links. The suite opened a guided lesson and verified its chapter return. |
| Chapter routes, refresh, contents, language, math | Passed | `just smoke-built tests/unified-learning.smoke.spec.cjs --port 4394 --workers=3`: 9/9 passed, including all eight chapters and the original Bézier chapter. Every deep link loaded directly, survived refresh, navigated contents, switched SL/EN, and showed typeset math without `mjx-merror`; chapter pages mounted no graph board. Log: `.command-logs/2026-10-25T22-26-10-652Z-21080-b7fea48f.log`. |
| Desktop and enlarged mobile reading | Passed | Inspected Functions and calculus at 1440×900 in Slovenian and English, and at 390×844 with 200% text. Both locales rendered the formulas; no visible raw TeX or MathJax errors. In the mobile keyboard walk, Enter opened contents and activated the first entry; URL became `#function-rules`, focus landed on `function-rules-heading`, and document width matched the viewport. |
| Arc-length demonstration route | Passed | `just smoke-built tests/demonstrations.smoke.spec.cjs --grep "arc-length renders its heading, graph, and inspector" --port 4395 --workers=1`: 1/1 passed. Log: `.command-logs/2026-10-25T22-28-33-329Z-74532-07059698.log`. |
| Learn page browser console | Passed | No console errors were exposed for the inspected Functions and calculus page. |

Screenshots saved and inspected: `.command-logs/unified-learning-desktop-sl.png`, `.command-logs/unified-learning-desktop-en.png`, and `.command-logs/unified-learning-mobile-200.png`.

## Preliminary run and coverage limits

The initial broad command used the earlier production build while the handler was rebuilding. It reported 74 passed and 8 failed. Seven new-chapter rows exposed that mobile contents activation did not focus its target heading; the handler fixed same-tab section navigation, rebuilt, and the final Learn suite passed. The eighth failure was an arc-length page without `.workspace-heading h1`; its captured page contained only `Build the app with npm run build first`. The smoke server serves that 404 when `build/index.html` is temporarily absent. The isolated arc-length rerun passed after the build stabilized.

The full shared-shell set (`standalone-learning`, home, and the complete demonstrations catalog) was not repeated after the final rebuild; those checks were included in the preliminary run, with 74 passing results. The final rerun covered every chapter and the formerly affected arc-length row. This checks a local production build only; hosted GitHub Pages behavior was not tested.

Cleanup: Playwright runners disposed their own previews; the temporary browser viewport was reset and the browser tab closed. The handler-owned preview on port 4390 was left running.

## Final handler recheck

After the upstream test-only fast-forward and the final first-draft definition edits, the handler rebuilt and reran `just smoke-built tests/unified-learning.smoke.spec.cjs --port 4396 --workers=3`: all 9 checks passed in 28.2 seconds. Log: `.command-logs/2026-10-25T22-38-27-080Z-85668-da1ffb42.log`. This is the final source/build checkpoint for the merged learning UI. The baseline checks above remain applicable: later production edits were confined to chapter prose, section focus, and the new reading routes. The upstream commit changed only test logging.
