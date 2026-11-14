# 05 Batch A: SV1–SV2 lessons (F3–F6)

Source: [solids spec](../../specs/solids-volumes-lessons.md), concept contracts SV1–SV2, and the [batch-wide acceptance gate](../../specs/solids-volumes-lessons.md#batch-wide-acceptance-gate). Graph: the solids graph (task 03), route `/analysis/solids`, section mode. Depends on 04 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the phase-portraits template commit `ddfd7684`:

- **F3**: scene actions on the solids graph (a `LessonAction` union entry `solids` with the actions SV1–SV2 need: solid, mode, plane normal, offset, camera preset), the lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Telesa in prostornine* / *Solids and volumes* owning them; `lesson: false` removed from the solids row. SV2 acceptance 5 (the axial triangle is drawn, similarity shown, not asserted) needs a drawn axial section of the pyramid beside the horizontal cut; it is added in `solidsScene.ts` as a construction polyline.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI; the phone misses owed by F2b (cube offset long tasks, cause of the cube hitch unprofiled) are measured here before any drawing change.

Handler decisions (handler 13, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly after *Analiza* (`analysis`), because the route is in the analysis family after the Riemann-sum rows and Batches B–C (Cavalieri, disc sums, \(\pi\int f^2\)) continue from them; SV1–SV2 open the chapter as its geometric start. Rejected: the *Geometrija ravnine* strand (plane geometry only) and *Ploskve in napredne teme* (Bézier patches). The revolve discs p95 phone miss belongs to revolve mode and moves to task 07.

Acceptance: the spec's acceptance for SV1–SV2; every number quoted in lesson text matches the scene readouts; side counts and areas available as text; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass.

Status: F3 done 2026-11-12 (handler 13; SV1–SV2, chapter skeleton, axial section, host and content tests; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-sol-a.md)); F4 done with F3 (chapter sections with guided examples); F5 cards captured (handler 20); catalog clip and F6 next.
