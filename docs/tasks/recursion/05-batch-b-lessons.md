# 05 Batch B: RG2 and RG4 lessons (F3–F6)

Source: [recursion spec](../../specs/recursion-growth-lessons.md), concept contracts RG2 and RG4, and the [batch-wide acceptance gate](../../specs/recursion-growth-lessons.md#batch-wide-acceptance-gate). Graph: the cobweb graph, route `/analysis/recursion`. Depends on 04 (Batch A released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lessons join the chapter of task 04, and the `recursion` action kind gains `set-start` and `set-step`. Owed by F2b: on a 390 px board the cosine fixed-point caption wraps into the diagonal caption and the map caption touches the y axis (F3 labels); browser timing of the cobweb playback is not measured (F6).

Acceptance: the spec's acceptance for RG2 and RG4; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the `fixed-point-*` lessons behave as before.

Status: F3 RG2 and RG4 written and joined (handler 25); F4 cards captured (handler 25); F5 `recursion-cobweb` clip (handler 25); live lesson smoke `.command-logs/rec-b/smoke/report.md`; F6 gate passed (handler 29: `just check` green at `29294b57`; live smoke `.command-logs/rec-c/f6/report.md`: direct open and refresh sl/en, labelled inputs, x0 drag and arrow key, restore on exit sl/en, Presets with file export and import and paused playback, Presentation mode, older `sequence`, `series`, `exponential`, `inverse-logarithm` and `fixed-point` lessons unchanged, figure export).
