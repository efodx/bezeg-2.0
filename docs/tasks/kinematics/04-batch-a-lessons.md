# 04 Batch A: KN1–KN2 lessons (F3–F6)

Source: [kinematics spec](../../specs/kinematics-lessons.md), concept contracts KN1–KN2, and the [batch-wide acceptance gate](../../specs/kinematics-lessons.md#batch-wide-acceptance-gate). Graph: `KinematicsGraph`, route `/curve-geometry/kinematics`. Depends on 03 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the combinatorics template commit `19af0446`:

- **F3**: scene actions on `KinematicsGraph` (a `LessonAction` union entry `kinematics` with the spec's `set-motion`, `set-time` and `set-params`), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Kinematika na krivuljah* / *Kinematics on curves* owning them; `lesson: false` removed from the row. Also the caption fix owed by task 03: captions clear of the y-axis tick labels.
- **F4**: chapter guided examples. **F5**: catalog clip that scrubs the time, example cards, Learn thumbnail. **F6**: batch gate, `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 11, 2026-11-12): the chapter sits in the Learn strand *Krivulje* directly after *Geometrija krivulj*, whose `curve-parametric` and `curve-curvature` lessons are its prerequisites. The phone-profile Play miss owed by task 03 is a rendering question, not a lesson one; it stays owed to F6 of this batch (profile first), so F3 does not change drawing.

Acceptance: the spec's acceptance for KN1–KN2; every number quoted in lesson text matches the scene; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; `curve-parametric` and `curve-curvature` behave as before.

Status: F3 done 2026-11-12 (evidence: [the F3 note](../../reviews/feature-streams/families-prep/notes/f3-kin-a.md)); F4–F6 open.
