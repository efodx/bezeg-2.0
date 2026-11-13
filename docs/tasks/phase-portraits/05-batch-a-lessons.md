# 05 Batch A: PP1–PP2 lessons (F3–F6)

Source: [phase-portraits spec](../../specs/phase-portraits-lessons.md), concept contracts PP1–PP2, and the [batch-wide acceptance gate](../../specs/phase-portraits-lessons.md#batch-wide-acceptance-gate). Graph: the phase-portrait graph, route `/analysis/phase-portrait`. Depends on 04 and linear-maps Batch B released.

Slices F3–F6 as in [07](07-batch-c-lessons.md), which runs first; the lessons join its chapter, and the `phase` action kind gains `set-matrix` and `set-system`. Owed by F2b: the seed drag at the phone limit and the seed counts 12/24/48 not reachable (F6, measure first).

Acceptance: the spec's acceptance for PP1–PP2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F6 gate passed 2026-11-13 (handler 18): `just check` on f6838e11, hosted CI green (run 43441198607), Presentation mode sl/en for all five lessons and the English chapter page smoke-checked (summary in the [PP3 note](../../reviews/feature-streams/families-prep/notes/pp-b-s2.md)). Done. Earlier: F3 PP1–PP2 written and joined, F5 cards (handler 17).
