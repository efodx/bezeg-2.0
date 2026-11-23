# 05 tests B (phase portrait, linear map): done

All 8 files pass together: 131 tests (before: 22 failed, 109 passed). eslint and tsc clean for these files.

Pattern used everywhere: `vi.mock` of loadMathJax, then `waitForPucks`, then a local `ready()` that also opens Orodja with `#board-card-tools .board-card-fold` (the layout folds Orodja at load once the board is laid out; role queries for Play, seed count and so on need it open). Helpers are local to each test file; the harness was not touched.

Behaviour differences the pucks introduce (assertions changed to the new real behaviour, product untouched):
1. Puck entry snaps an off-grid typed value to the step grid; the old Orodja field refused it (phase `1,3` -> 1.25). Out-of-range or non-numeric entries are refused with `.puck-notice` (state unchanged). `graph.editEntry` still refuses off-grid values (kept asserted).
2. LinearMapGraph.host: the `data-linear-map-notice` clamped/snapped messages no longer come from typed entries (the puck refuses above 4 and snaps 0.3 silently); the test asserts refusal plus the puck notice and the snapped model.
3. Puck big step is ten steps (`stepKeyDelta` default); the Orodja angle slider had `bigStep={6}` (a quarter turn of 15 degrees). The composition keyboard test now expects +10 for Shift+Arrow / PageUp. Possible product gap: `RangeParameter` has no `bigStep`.
4. The phase-portrait help `p.form-text` still covers the seed fields; matrix pucks state their range through aria-valuemin/max and the zoom puck through its help card.
