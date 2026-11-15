# 09 Batch C: TR5 lesson (F3–F6)

Source: [trigonometry spec](../../specs/trigonometry-lessons.md#tr5-solving-a-triangle-sss-sas-asaaas-and-ssa), concept contract TR5, and the batch-wide acceptance gate. Graph: `TriangleSolverGraph` mode `solve` (task 05), route `/triangle-solver`. Depends on 08 (Batch B released); ADR 0044 covers the input policy.

Slices F3–F6 as in [07](07-batch-a-lessons.md), applied to TR5 (both SSA solutions shown); F4 completes the chapter.

Acceptance: TR5 acceptance of the spec; scene actions tested in one synchronous sequence; notation test, `tsc`, sweeps and build pass.

Status: done (handler 30): F3 TR5 written and joined; F4 card; F5 no new clip (the triangle-solver poster and clip exist); F6 gate passed (`just check` green at 5e3ac9fd, live smokes `.command-logs/trig-c/smoke/`, `trig-c/f6/`).
