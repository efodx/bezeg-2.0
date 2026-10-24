# Landing audit remediation smoke

- Run: 2026-10-24, 7m10s from dispatch through final check (completed 09:06:42 UTC).
- Checkout: `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg`; revision `12275769d2ff218946756e85ef9adcc58167b63a`; working tree dirty with the landing-remediation changes. Source/build were frozen for browser checks; the full unit suite ran concurrently. Production entry was `index-B3FvDtll.js`.
- Target: production preview `http://127.0.0.1:4307/bezeg-2.0/`; production Playwright runner used isolated port 4311. HTTP 200 and entry identity were confirmed outside the sandbox. Browser: Playwright 1.64.0, headless Chromium 156.0.8078.4. Direct checks used 1440×900; suite also exercised 390px formula reading and the configured 1280×720 browser viewport.

| Check | Status | Observed evidence |
|---|---|---|
| Fresh home/catalog startup | Passed | In a clean context, home and catalog loaded the shared entry/runtime scripts only. `window.JXG` and `window.MathJax` stayed undefined and `MathJax-script` was absent. No graph or MathJax scripts were requested. |
| Home selection keyboard | Passed | Space on the focused Bernstein choice selected it (`aria-pressed=true`). |
| Catalog and graph route loading | Passed | 48 production Playwright tests passed in 1.0m, including all 45 catalog demonstration IDs with visible rendered graph and inspector, catalog card/destination checks, and the home entry flow. |
| Deep links, refresh, lesson query and unknown route | Passed | Catalog query/hash survived refresh; `/bezier/curve?learn=1&school=west#figure` entered a lesson after refresh and Exit preserved the other query/hash values; unknown demonstration offered the home recovery link and no graph. |
| Learning formula typesetting and language | Passed | Direct chapter route produced 168 actual `mjx-container` nodes from one `MathJax-script`. Switching language kept one script; refresh preserved `?school=west#parameter` and rendered formulas again. |
| Bézier point manipulation | Passed | Direct route refresh preserved `?school=west#figure`; editing (p_0) to `(0.75, -0.35)` changed the rendered curve path. |
| De Casteljau slider and lesson exit | Passed | Slider set (t=0.75); entering the lesson and exiting restored (t=0.75), including after returning to the chapter activity. |
| Rational weight manipulation | Passed | Weight changed from `2` to `2.25`; the rendered rational curve path changed. |
| Language retains scene | Passed | SL → EN → SL kept edited Bézier coordinates, selected curve, and geometry. |
| Preset save/reopen | Passed | Edited Bézier coordinates and rendered geometry returned after changing the scene and reopening the temporary preset. Browser storage was isolated to the test context. |
| PH lifecycle | Passed | Repeated polynomial → PH → polynomial navigation disposed main/child boards; PH selection mounted its auxiliary board and the returned Bézier editor remained usable. |
| Lesson observation and restore | Passed | Taylor observation could be hidden, the graph edited and reopened on the same frame, Continue advanced, and Exit restored the entry degree, bound state, board identity, view, and objects. |
| SVG/PNG export readiness | Passed | SVG download was 49,571 bytes and contained an `<svg>` root. PNG download was 35,894 bytes and had the valid PNG signature `89504e470d0a1a0a`. |
| Home visual recheck | Skipped | Handler already checked desktop and 390px in SL/EN, focus, and contrast; assignment asked to avoid duplicate screenshots. |
| PH generating-point editor controls | Skipped | PH route and auxiliary-board lifecycle were exercised; the generating-point editor itself was not opened. |

The first combined route-suite invocation stopped before browser tests because `tests/smoke-catalog.cjs` still expected the previous lesson registry constant. The handler updated its reader for the moved `lessonAvailability.ts` registry; the rerun passed all 48 tests. This was a smoke-harness mismatch, not an app runtime failure.

The direct-browser run recorded no uncaught page errors. It used a clean browser context, did not persist or delete user presets, and closed the context/browser afterward. The Playwright runner disposed its own port-4311 preview. The excluded carousel pause control was not tested. These checks do not establish physical-device behavior, exhaustive accessibility, performance, or GitHub Pages hosting acceptance.

## Handler follow-up

The handler subsequently closed the PH editor gap in the in-app browser: selecting the cubic PH curve showed the hodograph board; opening its coordinate editor exposed the generating-point inputs. Applying `w0 x = -3.25` in place of -3.5 changed the main-board SVG paths and arc-length readout (10.333 to 9.554). Restoring -3.5 restored the original readout. The handler closed the verification tab and stopped the owned port-4307 preview. This complements, rather than changes, the worker's scoped results above.
