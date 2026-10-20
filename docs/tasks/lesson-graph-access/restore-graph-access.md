# Make lesson instructions hideable without ending the lesson

**Source spec:** [Keep the graph usable during Guided lessons](../../specs/lesson-graph-access.md)
**Status:** completed, published and verified on 2026-10-20; small lesson tab selected in the source spec.

## Goal

Resolve the reported Observation prompt obstruction so learners can use the graph, reopen instructions, and continue their current lesson. See the source spec for the screenshot, alternatives, constraints, and acceptance criteria.

## Work

1. Reproduce the long higher-degree/Lagrange-error prompt on a narrow board and in Presentation mode. Record the actual close behavior, usable graph area, and current hide/continue/session transitions. Inspect current master and coordinate with any chapter/activity work already landed.
2. Present a bounded layout proposal using the spec's alternatives. Start with a small lesson tab that reopens instructions; evaluate responsive docking if needed. Resolve the design choice before coding a wider redesign and update the source spec's status and decision.
3. Implement reversible instruction visibility independently of session exit. Preserve frame, edited graph, view, and board ownership; make reopen, continue, and exit unambiguous. Handle focus, touch, long text, viewport resize, text enlargement, language switches, and animation behavior.
4. Add focused state/interaction coverage, run the applicable command-guide checks, and complete the shared-runtime browser review specified by the source spec. Record before/after screenshots, results, and incomplete coverage here.
5. Update affected interaction guidance and architecture documentation after behavior changes. Review, commit, and release according to AGENTS.md when implementation is authorized.

## Completion evidence

Baseline: production inputs validated before editing at `c2c3fcc`; the retained build records `7f6dc30` with dirty source inputs matching that validation. The local preview and system Chrome needed elevated localhost/process access. On `/bezeg-2.0/analysis/taylor?learn=1` at 390×844, the first Observation's compact card measured 342×245 over a 364×295 board. The exact reported Step 2 “Višja stopnja in Lagrangeeva ocena” Observation measured 342×264, about 84% of the board area. Its X exits the session and removes `?learn=1` while retaining the demonstration pathname; it does not provide reversible hiding. See [browser evidence](../../reviews/lesson-graph-access/browser-smoke.md) for exact frames, before/after screenshots, and final coverage.

Final acceptance maps each source-spec criterion to observed tests and browser evidence below. Physical-device testing is separate from touch emulation.

| Source criterion | Verification |
| --- | --- |
| 1 — Hide/edit/reopen/continue | New Taylor browser regression reaches Step 2's Lagrange Observation, hides it, edits degree, reopens the same frame, and advances with Continue. SL/EN exact long prompts and a shorter subdivision lesson were also exercised. |
| 2 — Preserve scene, view, session, board; no playback restart | Browser snapshots compare board identity, bounding box, dimensions and objects across hide/reopen; the edited degree survives. Component/host tests assert one session start, no scene action/restore on visibility changes, surviving inspector input and rapid-transition focus. Animation tests verify pause and no implicit restart. |
| 3 — Distinct actions, including Presentation | Labeled Hide instructions, Back to the instructions, Continue lesson and Exit lesson replace the X/movable card. Browser evidence verifies the reopen action lies outside the plot at 390px and in 1280×800 Presentation. |
| 4 — Exit/completion/Escape | Taylor regression restores pre-lesson degree, error-bound state and view on Exit. Shared runtime tests exercise completion, final exploration, backward navigation, Escape from a header control, and focus restoration. |
| 5 — Useful graph area and long text | Reading has bounded, top-aligned scrolling; hidden instructions leave the complete board free. Browser checks cover 390×844, 844×390, 1280×800, enlarged text, and both languages. A discovered inspector readout overflow was fixed with wrapping constraints. |
| 6 — Keyboard/touch/focus | Runtime/host tests and browser keyboard checks verify focus transfer and distinct navigation actions. Touch-emulated hide/reopen/Exit and Observation → Continue pass. Touch emulation does not establish physical-device or screen-reader behavior. |
| 7 — Existing ownership/contracts | No routes, preset formats, mathematical operations, or stored progress changed. Existing chapter activities retain their independent context. Full unit and browser suites provide regression coverage. |

Implementation verification: explicit `npx tsc --noEmit --pretty false` passed. Final `just check` passed 148 files / 2,511 unit tests, typecheck and production build (`.command-logs/2026-10-20T17-35-46-066Z-32952-d1c2c677.log`). The later CSS-only overflow repair was rebuilt successfully at `3112c56` plus this task's changes (`.command-logs/2026-10-20T17-39-12-579Z-36952-19251a35.log`); the intervening commit contained only unrelated planning documents. The existing bundle-size warning remains.

Independent engineering/mathematical and UI/accessibility source reviews found no remaining actionable issues. Earlier focus/scroll findings were repaired and rechecked.

The full local browser batch passed 231/233. One convexity initial-load resource error (`ERR_ADDRESS_IN_USE`) passed on the unchanged-build retry. A rational-elevation extras test accidentally treated the newly exposed Continue button as a graph action; both broad scene-action selectors were corrected. The affected cases, Observation/focus/playback, enlarged-text and touch regressions passed 13/13 (`.command-logs/2026-10-20T17-50-14-103Z-30648-dcde509f.log`), followed by all three rational-elevation lesson rows (`.command-logs/2026-10-20T17-51-58-142Z-35752-db628c79.log`). This is complete case coverage across runs, not a claim of a clean full local batch. The unchanged mathematical/runtime source passed the unit suite, and browser evidence covers every source acceptance criterion and the full checklist. A clean full CI batch remains the deployment gate.

Before/after images and detailed observations are in [the browser report](../../reviews/lesson-graph-access/browser-smoke.md). No physical-device or comprehensive screen-reader review is claimed.

Publication: app commit `194343fcfe0e520bf849979b202fb1d23649957a` was pushed as a fast-forward to `origin/master`. [Browser smoke run 39470115686](https://github.com/efodx/bezeg-2.0/actions/runs/39470115686) passed typecheck, all 2,511 unit tests and a clean 233/233 Chromium batch, then deployed Pages successfully. The live `/bezeg-2.0/analysis/taylor?learn=1` check reached Step 2 / Frame 3, hid instructions, changed degree 6 → 7, reopened the same frame with degree 7 retained, advanced to Step 3 with Continue, and restored degree 1 on explicit Exit. The route stayed on Taylor, and hiding retained the lesson query. Local previews and test contexts were cleaned up.
