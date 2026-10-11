# 4. Continuity

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 4

**Dependencies:** [Trigonometric functions](03-trigonometric-functions.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `continuity` demonstration at `/bezeg-2.0/functions/continuity` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/continuity.ts` (left value, right limit, jump, continuity test with 1e-9 tolerance, one-sided slopes); `ContinuityGraph` with the two pieces, filled and open points coloured by continuity, slider `a`, readout; `function-parameter` name `a`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 4 to `src/learning/content/functionGuidedLessons.ts` with tests, add `continuity` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
