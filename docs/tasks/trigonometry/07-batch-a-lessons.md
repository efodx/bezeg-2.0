# 07 Batch A: TR1–TR2 lessons (F3–F6)

Source: [trigonometry spec](../../specs/trigonometry-lessons.md#tr1-radian-sine-and-cosine-on-the-unit-circle), concept contracts TR1 and TR2, and the [batch-wide acceptance gate](../../specs/trigonometry-lessons.md#batch-wide-acceptance-gate). Graph: `UnitCircleGraph` (task 04), route `/functions/unit-circle`. Depends on 06 (F2b done).

## Slices

- **F3** (one slice, both lessons): scene actions on `UnitCircleGraph` for every step of TR1 and TR2 (a `LessonAction` union entry for the new action kind), the two guided lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31) in Slovenian and English, and the registration change that turns `lesson: false` into a lesson for `unit-circle` (remove the matching pending entries). Model: the feature-local projective conics family ([ADR 0059](../../adr/0059-feature-local-registration.md); `src/graphs/projective/`, `src/learning/content/projectiveConics*`).
- **F4**: bilingual chapter *Trigonometrija na enotski krožnici in v trikotniku* in Learn with chapter-owned guided examples (TR1–TR2 now; TR3–TR5 join in tasks 08–09).
- **F5**: catalog clip and example cards.
- **F6**: batch gate items 1–5 for TR1–TR2, `just check`, smoke of `/functions/unit-circle` and the lessons in both languages, hosted CI.

## Acceptance

1. TR1 acceptance 1–6 and TR2 acceptance 1–4 of the spec hold; every number quoted in lesson text matches the scene.
2. Each step's scene is reached by scene actions in one synchronous sequence (unit test), and restore on exit returns the free-exploration state.
3. `lessonMathNotation.test.ts`, `tsc`, the scene sweeps and the production build pass; the existing trigonometric function lesson is unchanged.

## Status

F3 not started.
