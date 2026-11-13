# 06 Batch B: PP3 lesson (F3–F6)

Source: [phase-portraits spec](../../specs/phase-portraits-lessons.md), concept contract PP3, and the [batch-wide acceptance gate](../../specs/phase-portraits-lessons.md#batch-wide-acceptance-gate). Graph: the phase-portrait graph, route `/analysis/phase-portrait`. Depends on 05.

Slices F3–F6 as in [07](07-batch-c-lessons.md), which runs first; the lessons join its chapter, and the `phase` action kind gains `set-matrix` and `set-system`.

Acceptance: the spec's acceptance for PP3; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 slice 1 done 2026-11-13 (handler 17): scene actions `set-zoom` and `set-equilibrium` with host tests and a probe of the PP3 openings ([note](../../reviews/feature-streams/families-prep/notes/pp-b-s1.md)); the lesson content, tests, join, smoke and card are next.
