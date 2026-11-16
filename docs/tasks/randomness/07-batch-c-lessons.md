# 07 Batch C: RS5–RS6 lessons (F3–F6)

Source: [randomness spec](../../specs/randomness-simulation-lessons.md), concept contracts RS5–RS6, and the [batch-wide acceptance gate](../../specs/randomness-simulation-lessons.md#batch-wide-acceptance-gate). Graph: the simulation graph, route `/probability/simulation`. Depends on 06 (Batch B released).

Slices F3–F6 as in [05](05-batch-a-lessons.md); the lessons join the chapter of task 05. Owed by F2b: the markov state box overflows at 390 px (F3 label item).

Acceptance: the spec's acceptance for RS5–RS6; every number quoted in lesson text matches the scene for its stated seed; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; statistics are never presented as proof; the `binomial-normal-approximation` and `clt-standardized-sum` lessons behave as before.

Status: F3 RS5 and RS6 written and joined, F4 cards captured, F5 no new clip, F6 gate passed (handler 34: live smokes `.command-logs/rand-c/smoke/`, `rand-c/f6/`, layout fixes 74554ee2, af85594e; handler 35: `just check` green at 2bb4848a); randomness family complete (A-C).
