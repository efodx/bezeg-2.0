# 1. Functions family foundation and linear function

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — Decisions, and lesson plan 1

**Dependencies:** none (first slice)

**Status:** planned

## Goal

Create the shared pieces of the new family and its first demonstration, the linear function, then its Guided lesson.

## Part A — support code

1. **Family and route.** Add family `/bezeg-2.0/functions` (title key `functions_and_calculus`) after `parametrizations` in `src/demonstrations.ts`; add demonstration `linear-function` at `/bezeg-2.0/functions/linear` with title and two prompts; bind it in `src/Routes.tsx`; add a family preview SVG `src/images/demonstrations/family-functions.svg` in the style of the existing family images and register it in `DemonstrationsPage.tsx`. Update tests asserting route, family and catalog counts.
2. **Mathematics module** `src/analysis/`: `linear.ts` (line through two points: `{kind: 'line', k, n}` or `{kind: 'vertical', x}`; points on a line for given `k`, `n` that keep the points' x-coordinates) with unit tests, including the vertical case and the lesson numbers.
3. **Shared graph base** `src/graphs/functions/BaseFunctionGraph.tsx`: synchronous model field as source of truth mirrored into React state; generated JSXGraph object tracking and disposal (`disposeFigureScene`); preset export/import of the model (`exportPresetData`/`importPresetData`) with domain sanitizing; `prepareLessonDefaultScene`; `captureLessonState`/`restoreLessonState` that also restore the synchronous model; an inspector readout component for numeric results using existing number formatting.
4. **Linear graph** `src/graphs/functions/LinearFunctionGraph.tsx`: points `P₁`, `P₂` snapped to 0.1, line, dashed slope triangle with `Δx`, `Δy` board labels, `k`/`n` sliders or number inputs (disabled for a vertical line), readout of `k`, `n` and the equation. Default `P₁=(0,1)`, `P₂=(2,5)`.
5. **Lesson action seam.** In `src/learning/model.ts` add the `function-parameter` kind from the spec with `FunctionParameterName = 'x1'|'y1'|'x2'|'y2'|'k'|'n'` (the `function-visibility` and `function-choice` kinds are added by the first concepts that need them), and in `guidedLessons.ts`/`lessonCatalog.ts` the scene action `set-function-parameter` with `{name, value}` validation. The graph applies them from the synchronous model.
6. **Presets.** Collection `linear-function` registered in `PresetImport.ts` with domain checks.
7. **Localization.** New keys in `sl.ts` with `en.ts` in lockstep; follow the `t` typing rules in AGENTS.md.

## Part B — lesson

`src/learning/content/functionGuidedLessons.ts` (+ test) with the five-step lesson from plan 1; register it in `getGuidedLesson`; add `linear-function` to `GUIDED_LESSON_AVAILABLE_IDS`; add a row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept. Additionally: repeated lesson entry/exit leaves the board object count stable; a multi-action scene (`x1`, `y1`, `x2`, `y2` in one scene) gives the expected line in a synchronous unit test.

## Verification

To be recorded on completion.
