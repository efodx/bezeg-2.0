# Handoff 05-wire (partial, budget; second pass)

## Done earlier (first worker)
ParameterPuck, PuckStrip, PuckOwnership (`PuckOwned`/`usePuckOwns`), pucks.css, strip in BoardCards, controls wrapped in `PuckOwned` (Taylor, FunctionTransformation, LinearMap, PhasePortrait, Decasteljau animation controls). Tests ParameterPuck.test (5), BoardCardsPucks.test.

## Done this pass
- BoardCards.tsx eslint error fixed: dropped manual `useMemo` on `puckKeys` and `strip` (compiler memoizes). eslint + tsc were clean before the last test edits (after: one unused import removed in TaylorGraph.host.test, not rechecked).
- Strip wrapping: `wrappedStripHeight(slots, width)` in PuckStrip.tsx; BoardCards measures every slot (`measuredStrip.slots`), probes the layout with the natural strip, and lays out again with the wrapped height when the layout's strip width is smaller; `.puck-strip` is `flex-wrap: wrap; align-content: flex-end`. NOT verified in a browser.
- Real regression found and fixed: the t puck did not follow playback (frames go to `LiveParameter`, not the store). New `LiveValueSource`/`PuckLiveValues`/`hasPuckLiveValues` in `src/graphs/base/controls/PuckOwnership.tsx`; `DecasteljauGraph.puckLiveValue(key)`; `ParameterPuck` shows the live value.
- BoardCardsPucks "Orodja marks the control" rewritten: asserts Orodja has no slider/spinbutton with a puck's label and no `[data-puck-param]`.
- Harness `src/graphs/base/realGraphTestHarness.tsx`: `waitForPucks(key?)` (strip present and not `visibility:hidden`), `puckControl(key)`, `typePuck(key, value)` (double-click entry, Enter); shim gives `.puck-slot` offset size 132x64.
- Doc row added to docs/tasks/ux-picks-app-wide/09-phone-presenter.md.
- Migrated and passing (run together): DecasteljauConstructionFirst, DecasteljauGraph.writes, DecasteljauPlaybackPublish, BaseGraph.escape, PlaybackRoutes (De Casteljau phone test is `test.skip` with task 09 reason; wide test asserts the puck), RationalOperationsConstructionFirst, AnalysisFirstTask (Taylor split into its own test: degree and centre are pucks, absent from Edit).

## Lesson for the rest
Graph tests need `installBoardShims()` and a `vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}))`; without the mock the board never becomes ready (strip stays hidden, role queries find nothing). Then `await waitForPucks(key)`. Replace Orodja steppers/inputs with `typePuck`, stepper buttons named `Povečaj: <label>` / `Zmanjšaj: <label>` (CountPuck), notices in `.puck-notice` (`puck_refuse_*`).

## Open
1. `src/graphs/functions/TaylorGraph.host.test.tsx` (edited, first test failing): after the shims the next failure is `getByRole('button', {name: /oceno napake/})` not found; this file renders `GraphHost` itself, so probably the Orodja card is not open/visible yet: also `await waitUntil` for the tools body (see PlaybackRoutes `mount` waiting on `#board-card-tools [data-card-body]`). The flat-example centre check (lines ~102-107) still reads the Orodja centre control (kept when the centre is fixed): check whether the centre puck is also shown when fixed (two controls of one name?).
2. Not yet migrated (still failing at the wide run): PhasePortraitGraph.test, .writes, .drag; PhasePortraitLessonActions.host; phasePortraitsGuidedLessons.test; FunctionTransformationGraph.host and .writes; FunctionsFirstTask; LinearMapGraph.host, LinearMapComposition.host, LinearMapCompositionLessonActions.host; BezierClippingControls.host (60 s timeout, unread; rerun alone, then read; do not stash).
3. Not run: full `just unit src/workspace src/graphs src/learning` after fixes (last full run: 48 failed tests in 20 files; the list above plus the ones now fixed), `just build`, eslint on all changed files, browser checks (Taylor, linear map, De Casteljau play then move t, phase portrait at 1440x900 and 1024x768 on http://127.0.0.1:4483/bezeg-2.0/, clearing `bezeg-2.0:board-layout`): strip rect, overlap, page errors, and the wrapped strip.
4. Contract gaps remain: no frame lock in `FrameDeclaration`; phone playback slot (task 09).
