# 3. Trigonometric functions

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 3

**Dependencies:** [Exponential function](02-exponential-function.md) (shared foundation and integration files)

**Status:** implemented on 2026-10-11; owner language and classroom review pending

## Goal

Add the `trigonometric-functions` demonstration at `/bezeg-2.0/functions/trigonometric` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/trigonometric.ts` (evaluation, amplitude, period, phase shift, range, tangent asymptote positions); `TrigonometricFunctionsGraph` with `sin|cos|tan` select, four sliders, reference graph toggle, midline, tangent drawn without joining across asymptotes; `function-parameter` names `A`, `omega`, `phi`, `B`; `function-choice` `trig-function`; `function-visibility` `reference`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 3 to `src/learning/content/functionGuidedLessons.ts` with tests, add `trigonometric-functions` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

- `npx tsc --noEmit --pretty false`: clean.
- Unit suite: 67 suites, 777 tests pass.
- `CI=false npm run build`: compiled; only pre-existing lint warnings.
- Lesson and route smoke for the three function routes: 12/12.
- Worker browser check: tan draws separate branches with dashed asymptotes; SL→EN switch updates board and inspector.

Adds the `function-choice` action kind (`set-function-choice`), `ChoiceSelect`, and an optional `formatValue` on `Slider`. The reference graph follows the chosen g, so the cosine step compares sin with φ=π/2 against the dashed sin x.
