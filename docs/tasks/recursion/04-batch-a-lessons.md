# 04 Batch A: RG1 and RG3 lessons (F3–F6)

Source: [recursion spec](../../specs/recursion-growth-lessons.md), concept contracts RG1 and RG3, and the [batch-wide acceptance gate](../../specs/recursion-growth-lessons.md#batch-wide-acceptance-gate). Graph: the growth graph (task 02), route `/analysis/growth`. Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the waves template commit `a2b110d1`:

- **F3**: scene actions on the growth graph (a `LessonAction` union entry `recursion` with the spec's `set-map`, `set-params` and `set-interest` for the growth panels; `set-start` and `set-step` join with the cobweb in task 05), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Rekurzija in modeli rasti* / *Recursion and growth models* owning them; `lesson: false` removed from the growth row.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 12, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly after *Analiza: od lokalnih korakov do sklepov*, whose convergence section holds the sequence and fixed-point lessons that RG1 and the later cobweb lessons build on, and before *Numerične metode*. The growth graph shows one panel and one sequence kind at a time, so RG1 step 4 ("bar chart of both") may show the two kinds in turn with their readouts; this keeps F3 free of drawing changes. No owed graph item applies to the growth graph.

Acceptance: the spec's acceptance for RG1 and RG3; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the `sequence-*`, `series-*`, `exponential-*`, `inverse-logarithm` and `fixed-point-*` lessons behave as before.

Status: F3 done 2026-11-12 (handler 12; RG1 and RG3, chapter skeleton, host and content tests; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-rec-a.md)); F4 done with F3 (chapter sections with guided examples); F5 cards captured (handler 20); catalog clip and F6 next.
