# Browser smoke evidence — restore graph access in Guided lessons

## Baseline before rebuild

- Checkout: `C:\Users\1337Hacker\Desktop\bezeg-2.0`; source HEAD `c2c3fcc68f70e44be3b9b513cb200c905d717034` at capture. The pre-edit production build was recorded as revision `7f6dc`; that label is not an input fingerprint. The handler had validated the app-input fingerprint before implementation edits.
- Preview: handler-owned local production preview at `http://127.0.0.1:4390/bezeg-2.0`. Source edits were underway during capture, but this was the unchanged production build.
- Browser: system Chrome, headless Playwright. No page or console errors observed. Captured at 390×844 and 1280×800.

| Baseline checklist row | Status | Evidence |
| --- | --- | --- |
| Entry and graph families | Partial | Taylor `/analysis/taylor?learn=1` opened with its board at 390×844. Polynomial Bézier `/bezier/curve` opened with board `jxgBoard1` at 848×528. Rational, spline and PH families were not checked in the baseline stage. |
| Point and slider response | Partial | Baseline free-point dragging and manual De Casteljau parameter-slider response were not captured. In the final preview, dragging polynomial Bézier control point p₁ changed its coordinates and the rendered curve path; setting De Casteljau t from 0.50 to 0.75 moved 10 construction points and changed the curve paths. |
| Family-specific controls | Skipped | Rational weight and PH generating-point editor were not tested in this focused run. |
| Navigation and lifecycle | Skipped | Repeated cross-family route switching was not tested. |
| Language retains scene | Partial | The baseline selector changed SL→EN by keyboard and updated the Bézier heading. Geometry/selection retention across that baseline switch was not measured. The after-state hidden-lesson language probe did retain the edited Taylor degree, board id and view. |
| Preset save/reopen | Skipped | Presets were not changed. |
| Guided lesson | Passed | The direct-entry Taylor lesson opened. On the exact Step 2 Lagrange observation, clicking “Opazuj na grafu” collapsed the reading overlay to the compact prompt and unlocked the board. On the old build the compact prompt remained at 342×264px at (24,19) over a 364×295px board, obscuring most of it. This is the reproduced defect. See [baseline Step 2 obstruction](baseline-taylor-step2-long-observation-390.png). The normal first reading card and Presentation reading overlay were **observed**, not marked as failures: they intentionally cover the graph while instructions are open. |
| Narrow viewport and keyboard | Partial | Taylor and Bézier boards loaded at 390px; baseline English/Slovenian selector and inspector tab keyboard operation are documented below in the after-state probes. Physical-device behavior was not tested. |

Other baseline captures: [initial Taylor reading at 390px](baseline-taylor-390.png), [Presentation reading at 1280×800](baseline-presentation-taylor-1280x800.png), and [direct-entry Exit behavior](baseline-taylor-exit-390.png). Direct `?learn=1` Exit removed the query while keeping the demonstration path; it did not compare a user-edited pre-lesson scene.

## After-state browser checks

- Final app source remained dirty on top of HEAD `3112c56` (the intervening commit was docs-only). The handler’s production `just build` completed using the final source at `.command-logs/2026-10-20T17-39-12-579Z-36952-19251a35.log`; preview 4390 served that build. System Chrome was run through the local Playwright runner.
- Focused `tests/lesson-graph-access.smoke.spec.cjs`: **3/3 passed**. This checks Taylor hide→edit degree→reopen same frame→Continue→Exit restoration; 390×844, 844×390 and 1280×800 Presentation geometry; root-font-size 200% scrolling/no horizontal overflow; and touch-emulated hide/reopen/Exit.
- Existing focused guided-lesson checks: Decasteljau playback pause/no-restart **1/1 passed**; corrected keyboard/Escape focus flow **1/1 passed**. A touch-emulated Observation→Continue check also passed.
- English and Slovenian Taylor Step 2 Lagrange observations were both reached at 390×844. Hiding left board `jxgBoard1`, view `[-4.318644, 6.5, 4.318644, -0.5]`, size 364×295px and 48 objects unchanged; document width stayed 390px. No runtime errors occurred. See [English open prompt](after-taylor-lagrange-en-open-390.png) and [English graph after hide](after-taylor-lagrange-en-hidden-390.png).
- Short non-animated Bézier subdivision Observation (`/bezier/subdivision-2`) hid at 390×844 with board id/view/size unchanged (61 objects). See [graph after hide](after-bezier-subdivision-hidden-390.png).
- In hidden Taylor Step 2, degree 4 and the same board/view survived SL→EN→SL; the translated “Back to the instructions” and “Continue lesson” actions appeared in each language. Reopening retained `Korak 2 od 7 · Okvir 3 od 3`.
- At 200% root font-size with the long Slovenian prompt at 390×844, lesson panel height/scroll were 694/1640px, document width remained 390px, and the final action remained within the panel. Scrolling the card and then the page placed the full action in view (y=685–799). This is a CSS root-font enlargement stress check, not browser zoom or physical-device text enlargement. See [200% action view](after-taylor-lagrange-sl-200-text-actions-390.png).
- Presentation at 1280×800 kept the reopener outside the plot (reopener x=972,y=11,w=165,h=34; board x=52,y=180,w=1158,h=520); reopening kept board id and view. The hidden Presentation screenshot shows the graph unobscured and the reopener in the workspace heading: [after hide](after-presentation-taylor-hidden-1280x800.png).
- Decasteljau playback moved the parameter from 0.50 to 0.53; after Pause it reached 0.59 and stayed at 0.59 after 300ms. The existing pause/reopen/Continue test also passed. See [animation in progress](after-decasteljau-animation-playing-1280x800.png).
- Touch emulation at 390×844 passed hide/reopen/Exit; a separate Observation check tapped Observe, then tapped header Continue, advancing Step 1 Frame 2 of 2 to Step 2 Frame 1 of 2. See [touch Continue result](after-touch-continue-390.png).
- On `/bezier/curve`, Tab moved from Edit to Display and Enter activated the tab. The language selector changed SL→EN using ArrowDown+Enter and updated the heading to “Bézier curve.” The corrected lesson keyboard test verified Escape hides without exiting and focus/reopen/Continue behavior.
- Additional final-preview interaction checks: mouse-dragging polynomial Bézier p₁ from (-3, 2) to (-2.3371, 2.3977) changed its rendered path; the De Casteljau t slider changed from 0.50 to 0.75, moving 10 construction points and updating curve paths. These are final-preview checks, not captured on the pre-edit build.

## Coverage and limits

The local full smoke run was still being repaired at report time: the handler reported 231 passes, plus a one-off `ERR_ADDRESS_IN_USE` on convexity initial load before the lesson mounted and a rational-extras selector that matched the new Continue action too broadly. An initial focused Escape check also invoked Escape after Observe had already hidden the panel; the sequence was corrected to reopen first and the corrected test passed. The handler is rerunning the affected rows; these are recorded as harness/environment failures, not product failures. Use the handler’s final full-suite/CI result for the final gate rather than treating the interrupted local run as clean.

The focused checks used a local production preview and headless system Chrome, not the in-app browser (loopback was unavailable there). Touch was Playwright touch emulation; no physical phone/tablet was used. Baseline rational weight, PH editor, free-point drag, manual De Casteljau slider, route-switching lifecycle and preset round-trip checks were not captured before the edit; final-preview point/slider behavior is recorded above. Browser contexts were closed after each run; no preset or shared language preference was changed. The handler-owned preview process remained under the handler’s control.

## Handler integration acceptance

Local acceptance completed on 2026-10-20. The full local batch passed **231/233** (`.command-logs/2026-10-20T17-42-51-798Z-39808-73fb5803.log`). Convexity failed before mounting because a resource reported `ERR_ADDRESS_IN_USE`; its unchanged-build retry passed. Rational elevation extras had a test selector that now matched Continue and advanced twice. Both broad scene-action selectors now exclude Continue. The corrected affected cases plus Observation, playback, responsive and touch regressions passed **13/13** (`.command-logs/2026-10-20T17-50-14-103Z-30648-dcde509f.log`); all three rational-elevation lesson rows then passed (`.command-logs/2026-10-20T17-51-58-142Z-35752-db628c79.log`). No clean full-local-batch claim is made. CI supplies that deployment gate.

The full browser checklist is covered by the final-preview probes above and passing cases from the same-source production batch:

| Checklist baseline | Final status | Evidence |
| --- | --- | --- |
| Entry and graph families | Passed | Home actions and all catalog routes, including polynomial, rational, spline C1 and cubic PH, passed in the full batch. |
| Point and slider response | Passed | Final-preview real polynomial point drag changed point and curve; De Casteljau t=0.50→0.75 moved ten construction points and curve paths. |
| Family-specific controls | Passed | Full-batch Farin weight/curve restoration and PH child-board editing/drag tests passed. |
| Navigation and lifecycle | Passed | Full-batch same-page polynomial/PH navigation test makes two round trips, checks board ownership, and edits after returning. |
| Language retains scene | Passed | Full-batch SL→EN→SL geometry/selection case and focused hidden Taylor degree/view/frame probe passed. |
| Preset save/reopen | Passed | Full-batch unique temporary preset save/change/reopen case restored edited Bézier coordinates. |
| Guided lesson | Passed | Exact Taylor Lagrange hide/edit/reopen/Continue/Exit; short nonanimated lesson; animated De Casteljau; final-scene exploration and entry restoration passed. |
| Narrow viewport and keyboard | Passed | 390px, 844×390, Presentation, SL/EN, 200% root font, inspector/language keyboard controls, Escape/focus, and touch-emulated Continue passed. |

The two later HEAD changes (`3112c56`, `7c2f097`) contained unrelated planning documents only; app source stayed frozen after the wrapping correction. No preset-format, route, mathematical, persistent-progress or chapter-entry changes were introduced. Physical-device and comprehensive assistive-technology testing remain outside this reported coverage. Publication results are recorded after the CI gate completes.

## Published verification

[CI run 39470115686](https://github.com/efodx/bezeg-2.0/actions/runs/39470115686) for app commit `194343fcfe0e520bf849979b202fb1d23649957a` passed typecheck, **2,511 unit tests** and a clean **233/233 Chromium batch**, then deployed GitHub Pages successfully on 2026-10-20. The source and acceptance criteria are fully verified within the browser/emulation limits above.

The handler then checked the real hosted route in the in-app browser: `/bezeg-2.0/analysis/taylor?learn=1`, Step 2 / Frame 3 “Višja stopnja in Lagrangeeva ocena”. Hide removed the lesson card and kept the query/session; degree increased 6 → 7 while the graph was available. Reopen showed the same Step 2 / Frame 3 and the graph still displayed degree 7. Continue advanced to Step 3 / Frame 1. Explicit Exit restored degree 1, removed the lesson query and returned focus to Learn. The graph SVG/container remained in place through the visible interaction. This hosted check complements the stricter local board/view snapshots, not a claim of hosted internal-state instrumentation. The handler-owned local preview was stopped.

Final parallel mathematical-preservation and engineering reviews of the wrapping/scene-action test repairs found no actionable issue. No unverified source acceptance criterion remains; physical devices and comprehensive screen-reader coverage were not part of this evidence.
