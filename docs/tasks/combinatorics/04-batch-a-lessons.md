# 04 Batch A: CB1–CB2 lessons (F3–F6)

Source: [combinatorics spec](../../specs/combinatorics-lessons.md), concept contracts CB1–CB2, and the [batch-wide acceptance gate](../../specs/combinatorics-lessons.md#batch-wide-acceptance-gate). Graphs: `LatticePathGraph` (route `/combinatorics/lattice-paths`, CB1) and `CountingTreeGraph` (route `/combinatorics/counting`, CB2). Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the circle-geometry template commit `ffb1d186`:

- **F3**: scene actions (a `LessonAction` union entry `combinatorics` with `set-target` on the lattice graph and `set-counting-mode` on the counting graph; `set-expansion` and `set-row` join in Batches B and C), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Kombinatorika in Pascalov trikotnik* / *Combinatorics and Pascal's triangle* owning them; `lesson: false` removed from both rows.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decision (handler 11, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly before *Verjetnost*, because counting is taught before probability and that strand already ends in probability; rejected: a one-chapter strand of its own.

Acceptance: the spec's acceptance for CB1–CB2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the Bernstein and binomial lessons behave as before.

Status: F3 done 2026-11-12 (handler 11; CB1 and CB2, chapter skeleton, host and content tests; evidence in the [slice notes](../../reviews/feature-streams/families-prep/notes/f3-comb-a.md)); reviews and F4–F6 next.
