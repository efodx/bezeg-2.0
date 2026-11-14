# 05 Batch A: RS1–RS2 lessons (F3–F6)

Source: [randomness spec](../../specs/randomness-simulation-lessons.md), concept contracts RS1–RS2, and the [batch-wide acceptance gate](../../specs/randomness-simulation-lessons.md#batch-wide-acceptance-gate). Graph: the simulation graph (task 03), route `/probability/simulation`. Depends on 04 (F2b done).

Slices, following the [F3 recipe](../../reviews/feature-streams/families-prep/notes/f3-trig-a.md) and the recursion template commit `2994856b`:

- **F3**: scene actions on the simulation graph (a `LessonAction` union entry `random`; the spec names no typed actions, so the content worker defines them on the waves pattern: mode, run parameters, seed and playback position, each validated through the state model before any write), the two lessons with [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), and the chapter skeleton *Naključje in simulacija* / *Randomness and simulation* owning them; `lesson: false` removed from the row.
- **F4**: chapter guided examples. **F5**: catalog clip, example cards, Learn thumbnail. **F6**: batch gate, the galton \(10^5\) phone-profile miss (measure the prefix re-simulation separately before choosing a fix), `just check`, smoke in both languages, hosted CI.

Handler decisions (handler 12, 2026-11-12): the chapter sits in the Learn strand *Funkcije in analiza* directly after *Verjetnost in statistika*, because RS1 compares the Galton board with the binomial-to-normal lesson of that chapter and RS2 with its central-limit lesson. The galton profile miss is a rendering measurement and stays with F6; the markov state box overflow belongs to RS5 and moves to task 07.

Acceptance: the spec's acceptance for RS1–RS2; every number quoted in lesson text matches the scene for its stated seed; scene actions tested in one synchronous sequence and restore on exit returns the free state; notation test, `tsc`, scene sweeps and the production build pass; statistics are never presented as proof; the `binomial-normal-approximation` and `clt-standardized-sum` lessons behave as before.

Status: F3 done 2026-11-12 (handler 12; RS1 and RS2, chapter skeleton, host and content tests; evidence in the [F3 note](../../reviews/feature-streams/families-prep/notes/f3-rand-a.md)); F4 done with F3 (chapter sections with guided examples); F5 cards captured (handler 20); catalog clip and F6 next.
