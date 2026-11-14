# 04 Batch A: WV1–WV2 lessons (F3–F6)

Source: [waves spec](../../specs/waves-sampling-lessons.md), concept contracts WV1–WV2, and the [batch-wide acceptance gate](../../specs/waves-sampling-lessons.md#batch-wide-acceptance-gate). Graph: the waves graph (task 02), route `/functions/waves`. Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the mechanical-curves template commit `3d5e03ad`:

- **F3**: scene actions on the waves graph (a `LessonAction` union entry `waves` with the spec's `set-mode`, `set-components`, `set-sampling` and `set-time`), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Valovanje, utripanje in vzorčenje* / *Waves, beats and sampling* owning them; `lesson: false` removed from the row. Also two label items task 03 owes: the sampling wheel labels (true, sample) clear of the arrow tip, and the y-axis title clear of the top tick label.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, the owed browser remeasure of a sinc state change and the split of the error computation from the redraw, the reduced-motion refresh of the Play and speed controls, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 11, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly after *Fourierove vrste*, because superposition and sampling build on the trigonometric functions and Fourier series. The measurement, the redraw split and the reduced-motion refresh are rendering and control items, not lesson ones; they stay owed to F6 of this batch, so F3 does not change drawing beyond the two label positions.

Acceptance: the spec's acceptance for WV1–WV2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; the trigonometric function and Fourier routes behave as before.

Status: F3 done 2026-11-12 (handler 11; WV1 and WV2, chapter skeleton, host and content tests, the two label fixes; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-waves-a.md)); F4 done with F3 (chapter sections with guided examples); F5 cards captured (handler 20); catalog clip and F6 next.
