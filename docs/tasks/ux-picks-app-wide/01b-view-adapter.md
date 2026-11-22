# 01b View adapter

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A2; [ADR 0064](../../adr/0064-source-tagged-scene-writes.md); [view fit design](../../reviews/ux-picks/view-fit.md).

## How master handles the view today (verified 2026-11-22 on `origin/master`)

- JSXGraph owns the bounding box. Wheel zoom and drag pan happen inside the library; the app reads the result (`src/graphs/base/BaseGraph.tsx`, `board.getBoundingBox()`).
- 75 `setBoundingBox(` calls in 49 non-test files under `src/` (150 including test files), plus `zoomIn`/`zoomOut` in BaseGraph's navigation buttons, among them parameter setters (Taylor's example setter), Reset, and preset restore. Corrected 2026-11-22 from a count that included tests; table in [view sites](../../reviews/ux-picks-app-wide/view-sites.md).
- Presets store `board.getBoundingBox()`.
- The prototype told a learner pan from its own glide by timing (`src/uxPicks/declare/useViewDirector.ts`), which is the kind of inference this plan removes.

So the view cannot simply become a store key. It needs an adapter between the store and the board.

## Goal

The board's view has two stored values, intent and fitted, written only through one adapter that knows who is writing.

## Slices

1. **Classify the 77 sites** (done, [view sites](../../reviews/ux-picks-app-wide/view-sites.md); design in [01b design](../../reviews/ux-picks-app-wide/01b-design.md)) into: initial view, a view that follows a parameter or example change, Reset, preset select or import, a lesson scene view, fit-to-points, and other. A worker produces the table (file, line, class) in `docs/reviews/ux-picks-app-wide/view-sites.md`; the handler decides the rule per class.
2. **Adapter** (handler-owned design): `setIntent(box, source)` and, for the director later, `setFitted(box)` under an `animation` lease. The adapter is the only caller of `board.setBoundingBox`. Sources by class: a lesson scene writes `lesson`; Reset, preset select and import, and fit-to-points are learner commands and write `learner`; a view set inside a parameter setter takes the source of the write it runs in; a resize is not a write, it is a refit trigger.
3. **Learner pan and zoom tagged by gesture, not timing:** the adapter opens a `learner` scope on board wheel, pointer and keyboard pan or zoom input, and a bounding-box change inside it becomes the new intent. A change outside any scope and not from the adapter is an untagged write and fails the development check of task 01.
4. **Sites moved** to the adapter by class, in worker batches by graph family.
5. **Presets store the intent view**, never a fitted one, so a saved preset does not depend on where cards were. Existing presets load unchanged (their stored box is an intent).

## Acceptance

- Unit tests: a learner gesture ends a fitted-view lease and its box becomes the intent; a fit never changes the intent; fitting an unchanged state twice gives the same box; Reset and preset restore win over a running glide.
- `PresetRoundTrip.contract` and the transient-state suites pass unchanged; a preset saved after a fit restores the intent view (new test).
- A search of non-test `src/` finds `setBoundingBox(` only in the adapter, and every other board method that changes the view (`zoomIn`, `zoomOut`, `zoom100`, `zoomElements`, `moveOrigin`, `setZoom`; the search does not catch them) is called only by the adapter.
- No visible change for a learner (no fit exists yet): checked by `just shot` contact sheets of the pilots before and after, judged by `bezeg-visual`.

## Not in this task

The director and the fit (task 07).
