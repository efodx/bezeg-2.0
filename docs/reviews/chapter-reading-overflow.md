# Chapter reading overflow repair

Source: [run 40302017782](https://github.com/efodx/bezeg-2.0/actions/runs/40302017782); [bounded spec](../specs/chapter-reading-overflow-fix.md).

## Diagnosis

The parametrization chapter failed the document-overflow assertion at 390px with English and 200% root text in both the original CI attempt and a handler-triggered retry. Default-font Windows runs passed, including all nine unified-learning rows. Master `b4d164a` also had a passing CI run, despite differing from failed `83fef14` only in documentation. A green rerun alone therefore did not establish a repair.

The responsible layout can be reproduced with wider font metrics. On the unchanged production build, Verdana made the `α parametrizations` exploration action about 373px wide inside 328px of card content, extending the document to 404px. Increasing real action-label letter spacing to `.12em` reproduced a 413px document without relying on an installed font. Inline-flex minimum content sizing allowed the unbreakable word and arrow to exceed their container.

The fix bounds exploration actions to their container and permits word wrapping. Injecting those constraints into the diagnostic page reduced document width to 390px, action width to 328px, and kept the arrow within the action. No page-level clipping, math changes, routes, storage or localization edits are involved. The actual font selected by CI was not measured; asynchronous MathJax reflow was observed locally but was not established as the cause.

## Verification

- Added the font-independent text-spacing case to the existing parametrization row without relaxing its page-overflow assertion; missing action links explicitly fail.
- Ran the new row against the unchanged `b4d164a` production build before rebuilding: failed the expected overflow assertion at `tests/unified-learning.smoke.spec.cjs:60`.
- Focused ESLint passed. The repaired production build passed; existing Sass dependency deprecation warnings remain.
- Independent production smoke passed all nine unified-learning rows (46.1s) on `b4d164a` plus the two-file repair. The parametrization row includes `.12em` action letter spacing.
- Final Chromium visual/keyboard checks passed in Slovenian and English at 390px/200% text: document width 390px, action width 328px (x=31–359), labels ending by x=299 and arrows by x=345 inside 358px cards. Wide formulas retained local scrolling. The handler visually inspected the English and Slovenian action-card captures.
- At 1440×900, Tab reached the action with a visible focus outline, Enter opened a live graph, and its actual Return to chapter link returned to the chapter. Runtime-error checks passed. The temporary preview and harness were cleaned up.
- The extra harness needed corrections to its config-relative server directory, language-render waiting, assumed return-link selectors and formula-readiness assumptions before its final pass. Those failures did not identify application regressions. Coverage is focused on chapter reading and its exploration link; no mathematical, graph-runtime, storage or hosting behavior changed. The full application suite is left to the pushed CI run.

An attempted repeated baseline run encountered a Node `ncrypto::CSPRNG` startup failure after multiple passes; this was separate from the page-overflow result. The implementation worker's budget watcher temporarily failed to read its rollout; the handler retained bounded assignments and later observed completion at 105,970 input tokens.
