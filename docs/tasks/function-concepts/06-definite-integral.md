# 6. Definite integral

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 6

**Dependencies:** [Derivative](05-derivative.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `definite-integral` demonstration at `/bezeg-2.0/functions/integral` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/riemann.ts` (left, right, midpoint, trapezoid sums; signed and oriented; exact integral from the catalog antiderivative); `DefiniteIntegralGraph` with function select, bounds on the x-axis, `n` slider 1–150, method select, rectangles or trapezoids with negative parts shaded differently, readout; `function-parameter` names `a`, `b`, `n`; `function-choice` `integral-function`, `sum-method`. Generated shapes must be disposed when `n` changes.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 6 to `src/learning/content/functionGuidedLessons.ts` with tests, add `definite-integral` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
