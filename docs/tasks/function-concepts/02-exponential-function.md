# 2. Exponential function

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 2

**Dependencies:** [Linear function](01-linear-function.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `exponential-function` demonstration at `/bezeg-2.0/functions/exponential` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/` exponential helpers if any are needed beyond `Math.pow` (e.g. sampled values for the lesson table); `ExponentialFunctionGraph` with base slider, marked points `(0,1)` and `(1,a)`, mirror toggle; `function-parameter` name `a`; `function-visibility` target `mirror`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 2 to `src/learning/content/functionGuidedLessons.ts` with tests, add `exponential-function` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
