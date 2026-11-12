# 05 Batch A: L1–L2 lessons (F3–F6)

Source: [isometries spec](../../specs/isometries-lessons.md), concept contracts L1–L2, and the [batch-wide acceptance gate](../../specs/isometries-lessons.md#batch-wide-acceptance-gate). Graph: `IsometryGraph` (task 03), route `/isometries`. Depends on 04 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md):

- **F3**: scene actions on `IsometryGraph` (a `LessonAction` union entry), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton owning them (all five lessons share `isometries`); `lesson: false` removed from the row.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Acceptance: the spec's acceptance for L1–L2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: not started.
