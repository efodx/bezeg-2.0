# 07 Batch C: PP4–PP5 lessons (F3–F6)

Source: [phase-portraits spec](../../specs/phase-portraits-lessons.md), concept contracts PP4–PP5, and the [batch-wide acceptance gate](../../specs/phase-portraits-lessons.md#batch-wide-acceptance-gate). Graph: the logistic-map graph (task 03), route `/analysis/logistic-map`. Depends on 04 (F2b done); ADR 0054 §3 removes the dependency on recursion RG4.

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the level-sets template commit `a055e1fa`:

- **F3**: scene actions on the logistic-map graph (a `LessonAction` union entry `phase` with the spec's `set-r`, `set-seed` and `set-zoom` as the logistic state needs them; `set-matrix` and `set-system` join with the phase-portrait graph in tasks 05–06), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Fazni portreti in dinamični sistemi* / *Phase portraits and dynamical systems* owning them; `lesson: false` removed from the logistic-map row only. The label item task 04 listed (logistic y-axis numbers below 0 in the caption rows) was already fixed in `93d9eba9` (negative tick numbers blanked); F3 adds a gap test.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 12, 2026-11-12): Batch C runs before Batches A and B, because Batch A waits for linear-maps Batch B and Batch C has no such dependency. The chapter sits in the Learn strand *Funkcije in analiza* directly after *Rekurzija in modeli rasti*, because the logistic map continues the recursion chapter's iteration past \(r=3\), where the recursion spec stops; the phase-plane lessons join the same chapter later.

Acceptance: the spec's acceptance for PP4–PP5; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 12; PP4 and PP5, chapter skeleton, host and content tests; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-pp-c.md)); F4–F6 next.
