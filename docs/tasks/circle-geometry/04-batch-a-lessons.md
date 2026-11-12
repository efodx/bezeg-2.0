# 04 Batch A: CG1–CG2 lessons (F3–F6)

Source: [circle geometry spec](../../specs/circle-geometry-lessons.md), concept contracts CG1–CG2, and the [batch-wide acceptance gate](../../specs/circle-geometry-lessons.md#batch-wide-acceptance-gate). Graph: `CircleConstructionGraph` (task 02), route `/circle-constructions`. Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) of trigonometry Batch A and the analytic-lines template commit `092ef897`:

- **F3**: scene actions on `CircleConstructionGraph` (a `LessonAction` union entry `circle` with the spec's `set-mode`, `set-circle`, `set-point`; `set-ratio` joins in Batch B), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Geometrija krožnice* / *Circle geometry and constructions* owning them (the catalog keeps one lesson per Demonstration, and all four lessons share `circle-construction`); `lesson: false` removed from the row.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 11, 2026-11-12): the chapter sits in the plane-geometry strand after *Analitična geometrija premice* and before projective conics. The radical mode always draws three circles; CG2 steps 1–5 keep the third circle in its default place and the text names it as waiting for step 6, instead of adding a show-third-circle field to the state and Presets (rejected: a stored-state change for one lesson step).

Acceptance: the spec's acceptance for CG1–CG2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 11; CG1 and CG2, chapter skeleton, host and content tests; evidence in the [slice notes](../../reviews/feature-streams/families-prep/notes/f3-circle-a.md)); reviews and F4–F6 next.
