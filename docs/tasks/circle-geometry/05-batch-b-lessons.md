# 05 Batch B: CG3–CG4 lessons (F3–F6)

Source: [circle geometry spec](../../specs/circle-geometry-lessons.md), concept contracts CG3–CG4, and the [batch-wide acceptance gate](../../specs/circle-geometry-lessons.md#batch-wide-acceptance-gate). Graph: `CircleConstructionGraph` (task 02), route `/circle-constructions`. Depends on 04 (Batch A released).

Slices F3–F6 as in [04](04-batch-a-lessons.md); the lessons join the chapter of task 04, and the scene actions gain `set-ratio`.

Acceptance: the spec's acceptance for CG3–CG4; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 14; CG3 `circle-construction-apollonius`, CG4 `circle-construction-common-tangents`, sections `apollonius-circle` and `common-tangents` in the chapter `circle-geometry`, new operation `set-apollonius` of the action kind `circle`; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-circle-b.md)); F4–F6 next. Owed: no browser look at the Apollonius and common-tangent modes during the lessons or at the new chapter sections (one default smoke row per Demonstration); the Slovenian prose has no second reader.
