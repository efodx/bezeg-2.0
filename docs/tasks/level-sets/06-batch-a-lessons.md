# 06 Batch A: LS5 lesson (F3–F6)

Source: [level-sets spec](../../specs/level-sets-optimization-lessons.md), concept contract LS5, and the [batch-wide acceptance gate](../../specs/level-sets-optimization-lessons.md#batch-wide-acceptance-gate). Graph: the linear-program graph (task 04), route `/analysis/linear-program`. Depends on 05 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the randomness template commit `3aa360d8`:

- **F3**: scene actions on the linear-program graph (a `LessonAction` union entry `levelsets` with the spec's `set-objective` and whatever constraint or walk actions LS5 needs; `set-function`, `set-level`, `set-probe` and `set-step` join with the contour graph in tasks 07–08), the lesson with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Nivojnice, gradient in optimizacija* / *Level sets, gradient and optimization* owning it; `lesson: false` removed from the linear-program row only.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 12, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly after *Numerične metode*: gradient descent and constrained optimization (Batch C) follow root finding there, and LS5 needs no contour view. The owed phone misses (contour level and probe drags, the surface board on drags, N 40/80/120) belong to the contour graph and move to task 07.

Acceptance: the spec's acceptance for LS5; vertex coordinates exact fractions; unbounded and infeasible statuses as text; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 12; LS5, chapter skeleton, host and content tests; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-ls-a.md)); F4 done with F3 (chapter sections with guided examples); F5 cards captured (handler 20); catalog clip and F6 next.
