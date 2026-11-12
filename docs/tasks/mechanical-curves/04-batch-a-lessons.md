# 04 Batch A: MC1–MC2 lessons (F3–F6)

Source: [mechanical curves spec](../../specs/mechanical-curves-lessons.md), concept contracts MC1–MC2, and the [batch-wide acceptance gate](../../specs/mechanical-curves-lessons.md#batch-wide-acceptance-gate). Graph: the descent graph (task 02), route `/curve-geometry/descent`. Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the kinematics template commit `6c588f64`:

- **F3**: scene actions on the descent graph (a `LessonAction` union entry `descent`), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Mehanske krivulje: najhitrejši spust* / *Mechanical curves: the fastest descent* owning them; `lesson: false` removed from the row. Also the item task 03 owes: the opening view must show the whole circular arc at 1280 px.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, browser timing, `just check`, smoke in both languages, hosted CI.

Handler decision (handler 11, 2026-11-12): the chapter sits in the Learn strand *Krivulje* directly after *Kinematika na krivuljah*, as the route sits after `curve-kinematics` in *Geometrija krivulj*.

Acceptance: the spec's acceptance for MC1–MC2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; `curve-parametric` behaves as before.

Status: F3 done 2026-11-12 (scene actions, MC1 and MC2 text, chapter wiring, host and content tests; see [the worker notes](../../reviews/feature-streams/families-prep/notes/f3-mech-a.md)); F4-F6 not started.
