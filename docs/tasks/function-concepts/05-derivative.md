# 5. Derivative

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 5

**Dependencies:** [Continuity](04-continuity.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `derivative` demonstration at `/bezeg-2.0/functions/derivative` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/functions.ts` catalog (`square`, `sin`, `exp` with exact derivative and antiderivative, reused by later concepts) and `src/analysis/derivative.ts` (difference quotient, secant, tangent); `DerivativeGraph` with function select, glider on the graph at `x0`, second point, secant, `h` slider excluding `|h|<0.01`, tangent toggle, readout; `function-parameter` names `x0`, `h`; `function-choice` `derivative-function`; `function-visibility` `tangent`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 5 to `src/learning/content/functionGuidedLessons.ts` with tests, add `derivative` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
