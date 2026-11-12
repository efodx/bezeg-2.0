# 05 Batch A: L1–L2 lessons (F3–F6)

Source: [isometries spec](../../specs/isometries-lessons.md), concept contracts L1–L2, and the [batch-wide acceptance gate](../../specs/isometries-lessons.md#batch-wide-acceptance-gate). Graph: `IsometryGraph` (task 03), route `/isometries`. Depends on 04 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md):

- **F3**: scene actions on `IsometryGraph` (a `LessonAction` union entry), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton owning them (all five lessons share `isometries`); `lesson: false` removed from the row.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Acceptance: the spec's acceptance for L1–L2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 10; engineering and mathematical review, Sonnet, no blocking findings; owed: the quotes test checks substrings only and two quoted points are vacuous, only the first vertex image is asserted, `half-angle` is half the normalized rotation and would differ from the angle between mirrors beyond 90° (no scene reaches it)). L1 (two mirrors) and L2 (classifying a motion) are written: five steps each, sl+en, scene actions `isometry` `set-mode` / `set-mirror-count` / `set-mirrors` (integer grid points, validated before the write), chapter `isometries` in the maps strand after `complex-maps` (no thumbnail yet). Owed: chapter guided examples (F4), poster, clip and Learn thumbnail (F5). Evidence: [note](../../reviews/feature-streams/families-prep/notes/f3-iso-a.md).
