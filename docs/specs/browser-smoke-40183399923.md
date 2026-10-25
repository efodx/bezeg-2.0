# Browser smoke run 40183399923 repair

## Scope

Repair the three failures in [the failed job](https://github.com/efodx/bezeg-2.0/actions/runs/40183399923/job/121139012401), based on `28d27da`. Preserve routes, Presets, mathematical behavior, existing assertions and unrelated working-tree changes.

## Acceptance

- Rational/base and Bézier/decasteljau editing checks add a real point, drag that same point, then delete it, verifying board geometry after each action. Determine whether the failure is interaction behavior or test targeting before changing it.
- Taylor lesson reading at 320px and 200% text size stays within the document width in Slovenian and English. Header/footer actions retain usable targets, text and pointer access. Fix actual overflow rather than hiding it at the document root.
- Preserve existing lesson navigation, scene ownership and hide/exit behavior, under the lesson experience and curve editing mode specifications.
- Capture failing evidence before the repair (including repeated execution or a deterministic trigger for intermittent behavior), then pass focused repetitions, relevant unit/type checks and the production build. Run the required browser smoke checks and record coverage limits.

## Initial evidence

CI: rational/base point count was 13 after deletion instead of 12; both small-enlarged lesson checks reported document overflow. All four selected local scenarios passed once on the unchanged production build, so the failures require timing/environment investigation before a repair.

## Repair and evidence

- The original curve test subsequently failed on both routes. It reused the requested drag destination as the deletion target. The repaired test tracks the added board point by ID, checks that it moved, recomputes its current screen coordinates before each interaction, checks that the same point was removed, and retains the final board-point-count assertion. Six consecutive focused runs passed before integration.
- The unchanged mobile inspector uses a fixed 64px title reservation beside an absolutely positioned collapse action. At 320px and 200% text the new non-overlap assertion failed: title bounds x29–291 overlapped button bounds x203–297. The mobile override places the action in normal flow below the title. The original document-width assertion remains, with element metrics on failure; no root overflow clipping is added.
- `just check` on the integrated source with `npm ci` dependencies passed TypeScript, ESLint, all 166 unit files / 3,429 tests, and the production build. Existing build warnings remain. Logs are local under `.command-logs/`.
- The original CI document-width failure itself did not reproduce locally: Windows Chromium reported 320px document width. The heading collision reproduced independently and is fixed; Linux CI must confirm the original width failure is resolved.
- The initial temporary forced-scroll probe remained unresolved in this first pass; it was subsequently classified and incorporated into the regression below. No mathematical implementation, routes or stored Presets changed.
- Integrated production Chromium suite: all 276 tests passed, including both curve-editing cases, both 320px/200% reading cases, shared lesson runtime, navigation, persistence and route checks (`just smoke-built --port 4399 --workers=4`, 10.6 minutes). The handler reviewed the small diff; mathematical implementation is unchanged.
- The four affected cases passed three repetitions (12 executions). A corrected handler Playwright check at 320px/200% in both languages verified actual pointer collapse/reopen of `#inspector-content`, 320px document width before/after, no header overlap, targets over 44px, and no page/console errors. Both rendered header captures were inspected. The worker's first custom checker incorrectly expected tabs to hide; that expectation was corrected to the component's content region before accepting the check.

## Root-cause follow-up

The first post-push [Linux recheck](https://github.com/efodx/bezeg-2.0/actions/runs/40186990197) retained all three original failures. The first-pass local results did not establish resolution of the CI defects.

- JSXGraph caches the board's container position for a second and throughout dragging. A deterministic scroll probe showed an 83px stale offset; even clicking the actual point's SVG center missed it. Clearing only that cache before pointer handling resolved the probe. `GraphSession` now clears `cPos` in a capture-phase `pointerdown` listener, before native JSXGraph handlers, and removes its owned listener on disposal. Stationary and forced-scroll checks on both routes passed three repetitions (12 executions); the ordering/disposal unit regression failed before the fix, and all 21 focused lifecycle/host/drag tests passed. The separate PH auxiliary input board initializes JSXGraph directly and is outside this hook; the selected-curve workflow uses the main owned board.
- Lesson prose/formula overflow was locally contained. The document overflow came from lower-page inspector controls omitted by the first diagnostic excerpt: the rigid count input and two buttons exceeded their row; after wrapping it, Slovenian tabs could still exceed their tracks under wider fonts. Verdana/Tahoma reproduced document widths of 325–328px at 320px. Changing only the count row to wrap, then only the tab tracks/label wrapping, restored 320px. Full-body font regressions remain in the suite; no root overflow clipping or formula changes were introduced.
- Wrapping also exposed a desktop compact-button override: the plus button on its own line was only 37.2px tall. Its explicit 44px minimum is restored. The existing Bernstein smoke assertion now checks actual two-dimensional non-overlap, containment, hit target size and pointer access while retaining numeric/keyboard editing checks, allowing the intended wrapped layout.
- New overflow cases passed three repetitions (12 executions), and six direct SL/EN/default/Verdana/Tahoma checks verified real tab/count interactions and local formula scrolling. Both wrapped-control captures were inspected. Broader interaction verification passed 70 cases across catalog routes, presets/language, picker, auxiliary geometry and PH lifecycle; 24 shared lesson/reading cases passed. After the last target-size correction, all seven count/default-font/wide-font regression cases passed. Scoped lint, TypeScript, four CountSetter unit tests and production builds passed. Full lesson-content walks were not repeated locally; Linux CI reruns the complete suite.

## Final Linux acceptance

[Run40189636758, attempt2](https://github.com/efodx/bezeg-2.0/actions/runs/40189636758/attempts/2) passed TypeScript, ESLint, all166 unit files/3,430 tests, all280 Chromium cases, and GitHub Pages deployment. This verifies the original failures, both forced-scroll variants, and both default/wider-font enlarged-reading variants on Linux. Source fixes are867aaf0 andefd46a8; the run's concurrent tooling commits did not change application or browser-test files.

The first attempt passed279 cases, including every original/new regression, but stalled once during spline-parameterization lesson exit until its150-second overall deadline. The captured trace has no page-error/crash event. That case passed3 normal-speed local repetitions and3 at4xCPU throttling, then passed in23.9seconds on one unchanged manual Linux job rerun. No retry setting, timeout increase, or speculative source change was introduced. Retain the isolated timeout as follow-up evidence if it recurs; it is not claimed to have a diagnosed application fix.
