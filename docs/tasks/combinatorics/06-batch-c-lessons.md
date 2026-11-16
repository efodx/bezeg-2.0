# 06 Batch C: CB5 lessons (F3–F6)

Source: [combinatorics spec](../../specs/combinatorics-lessons.md), concept contracts CB5, and the [batch-wide acceptance gate](../../specs/combinatorics-lessons.md#batch-wide-acceptance-gate). Depends on 05 (Batch B released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lessons join the chapter of task 04, and the scene actions gain `set-row`.

Acceptance: the spec's acceptance for CB5; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the Bernstein and binomial lessons behave as before.

Status: done 2026-11-16. F3 CB5 `counting-tree-cb5` written and joined as section `row-sums` (handler 32; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-comb-c.md)); F4 card captured; F5 no new clip (the `counting-tree` poster and clip cover the Demonstration); F6 gate passed (handler 32: `just check` green at `149f4911`; live smokes `.command-logs/comb-c/smoke/report.md`, `.command-logs/comb-c/f6/report.md`, recheck `.command-logs/comb-c/recheck/`). The gate smokes found the row view illegible (bars packed left for small n, row numbers colliding at n = 20, captions overprinting at 390 px), fixed in `2747b047` and `149f4911` and rechecked live at 1366, in Presentation mode and at 390 px. Gaps: at 390 px some row numbers are omitted (a note points to the readouts); the bars use about a third of a wide desktop board (the view box is fixed; spreading over the visible range broke the capture geometry check); Presets export as `presets.txt`.
