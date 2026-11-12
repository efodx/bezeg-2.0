# 05 Batch B: L3–L4 lessons (F3–F6)

Source: [analytic lines spec](../../specs/analytic-lines-lessons.md), concept contracts L3–L4, and the [batch-wide acceptance gate](../../specs/analytic-lines-lessons.md#batch-wide-acceptance-gate). Graph: `LineGeometryGraph` (task 02), route `/line-geometry`. Depends on 04 (Batch A released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lessons join the chapter of task 04.

Acceptance: the spec's acceptance for L3–L4; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 14; L3 `line-geometry-angle`, L4 `line-geometry-distance` on `line-geometry`, sections `angle-between-lines` and `distance-point-line` in the chapter `analytic-lines`, action kind `lines` unchanged; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-lines-b.md)); F4–F6 next. Owed: no browser look at the new sections or at the angle and distance modes during the lessons (one default smoke row per Demonstration); the Slovenian prose has no second reader.
