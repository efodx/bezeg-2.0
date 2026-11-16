# 06 Batch B: RS3–RS4 lessons (F3–F6)

Source: [randomness spec](../../specs/randomness-simulation-lessons.md), concept contracts RS3–RS4, and the [batch-wide acceptance gate](../../specs/randomness-simulation-lessons.md#batch-wide-acceptance-gate). Graph: the simulation graph, route `/probability/simulation`. Depends on 05 (Batch A released).

Slices F3–F6 as in [05](05-batch-a-lessons.md); the lessons join the chapter of task 05.

Acceptance: the spec's acceptance for RS3–RS4; every number quoted in lesson text matches the scene for its stated seed; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; statistics are never presented as proof; the `binomial-normal-approximation` and `clt-standardized-sum` lessons behave as before.

Status: F3 RS3 and RS4 written and joined, F4 cards captured, F5 no new clip, F6 gate passed (handler 33: `just check` green at 040d4bd0, live smokes `.command-logs/rand-b/smoke/`, `rand-b/f6/`); layout fix 4a620878 rechecked live and the Monte Carlo card recaptured (handler 34, bc3569c0).
