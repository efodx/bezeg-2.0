# 19 — Monotone partition lesson C3 (S2, F3)

Status: planned 2026-11-02 (geometry handler 26). Source: spec [C3](../../specs/sweep-algorithms-lessons.md#c3-partitioning-a-polygon-into-monotone-pieces) (goal, both examples, steps 1–7, acceptance 1, 5), [testing decisions](../../specs/sweep-algorithms-lessons.md#testing-decisions), [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Kind: F3; review covers scene actions, readouts and counts, not prose. Depends on 16 and 18. Template: [task 12](12-segment-intersections-lesson.md).

## Decisions (handler 26, 2026-11-02)

- **Actions.** `MonotonePartitionGraph` accepts `set-points` in polygon mode, adopts `set-trace-step` and registers `algorithm-trace`, like `BentleyOttmannGraph`.
- **Owner.** As for S1 (tasks 11–13): the lesson starts under the interim owner in `guidedLessonOwnership.ts`, and task 21 moves it to its `sweep-algorithms` section. The chapter page does not advertise it before task 21.
- **Quoted values** are read from the graph at the quoted step; if a readout differs from the spec, the handler rechecks the kernel before the text changes.

## Acceptance

1. **Lesson** C3 (`monotone-partition`) in `src/learning/content/compgeoGuidedLessons.ts`, the spec's seven steps on the first example \(P=(0,0),(4,3),(8,0),(12,8),(8,5),(4,8)\): the prediction step (which vertices break monotonicity) before Next reveals the types; the merge vertex \((8,5)\) as helper; the diagonal \((4,3)(8,5)\); two pieces of area \(20\). One step uses the second example to show that a merge vertex alone needs a diagonal. The last step is free exploration. Playback is stopped by default and never autoplays. Update `lessonCatalog.test.ts`, the preview-copy counts and the smoke `LESSONS` list.
2. **Views.** Every scene has a `view` that frames its polygon.
3. **Text:** one-shot, Slovenian and English, terms from the spec's table; the lesson names the tie rule (equal heights: smaller \(x\) first) and the refusal of three collinear consecutive vertices. Every quoted value equals the readout at that step; formulas wrapped per `lessonMathNotation.test.ts`.
4. **Tests:** frames in one synchronous sequence; readouts at the quoted steps (types, helper, diagonals, pieces) for both examples; `set-trace-step` clamps; Back and a scene change pause playback and leave no pending callback. An observed failure under a mutation for each new assertion.

Checks: tsc, lint on touched files, `just unit src/learning src/graphs/compgeo`, build. Handler: engineering review, mathematical recheck of quoted values against the kernel, `just smoke-lesson monotone-partition` and both languages with a live switch.
