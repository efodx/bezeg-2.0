# 7. Area between curves

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 7

**Dependencies:** [Definite integral](06-definite-integral.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `area-between-curves` demonstration at `/bezeg-2.0/functions/area-between` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/areaBetween.ts` (signed `∫(g−f)`, unsigned `∫|g−f|` split at intersections or adaptive Simpson to 1e-6, intersections of the two default curves); `AreaBetweenCurvesGraph` with both curves, bounds on the x-axis, mode select, shading, intersection markers, readout; `function-parameter` names `a`, `b`; `function-choice` `area-mode`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 7 to `src/learning/content/functionGuidedLessons.ts` with tests, add `area-between-curves` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
