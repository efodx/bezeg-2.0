# Implement Cohort C Guided lessons

**Source spec:** [Guided lesson content expansion blueprint](../../specs/guided-lessons-content-expansion.md) — Cohort C implementation contract

**Dependencies:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md); [Cohort B](implement-cohort-b.md) patterns for graph seams, content, and smoke coverage

**Status:** ready; implementation not started

## Goal

Add draft Guided lessons for `weighted-parameterization` and `uniform-parameterization`, backed by tested graph-owned parameterization actions, and allowlist them as drafts once the blueprint's route-level gates pass.

## Slices

Slices 1 and 2 can run in parallel. Slice 3 waits for both.

1. **Weighted parameterization seam**: owns `src/graphs/curves/parametrisations/AlphaParamBezierCurveGraph.tsx`, its new test, and the three new `LessonAction` variants in `src/learning/model.ts`:
   - `{kind: 'parameterization-alpha'; value: number}`;
   - `{kind: 'parameterization-samples'; count: number}`;
   - `{kind: 'parameterization-mode'; mode: 'weighted' | 'uniform'}`.

   Handle α and sample count with validation before mutation, prepare the default scene (α ½, 10 samples), and make sure regenerating samples removes only generated sample points. Test the worked values, the symmetry, that control points don't change, that no sample points accumulate, and the action bounds.
2. **Uniform parameterization seam**: owns `src/graphs/curves/parametrisations/UniformParamBezierCurveGraph.tsx` and its new test. Handle all three actions (mode switches between weighted and arc-length sampling) and prepare the default scene (weighted mode, α ½, 10 samples). Remove the leftover `console.log`. Test that `s(1)` agrees with quadrature, the equal-arc-length gaps in uniform mode within tolerance, the weighted-mode samples, sample ownership, and the bounds.
3. **Content and integration**: owns a new `src/learning/content/parameterizationGuidedLessons.ts` and its test, plus registration in `guidedLessons.ts`, the scene-action mapping and allowlist in `lessonCatalog.ts`, catalog-count tests, and a new `tests/guided-lessons-cohort-c.smoke.spec.cjs`.
   - Write 4–6 step Slovenian-first lessons with English counterparts, sources, and the blueprint's worked values; the PH lesson states the implementation's computed length.
   - All inline math in prose must be delimited `\(...\)`. `lessonMathNotation.test.ts` must cover the new module.
   - Smoke coverage: deep links, full Next/Back traversal, Exit restoring a user-changed α and sample count (and mode on the PH route), no sample-point growth across re-entry, English, 390-pixel width, keyboard.

## Acceptance criteria

- Blueprint route-level criteria 1–4 and 6 pass for both routes; criterion 5 owner language and classroom review stay pending.
- Lesson Exit restores α, sample count, mode, the matching slider/selector displays, and exactly the original control points; repeated entry and exit do not accumulate generated points.
- Routes, Preset identifiers, stored presets, import/export formats, and parameterization formulas are unchanged.
- `npx tsc --noEmit --pretty false`, the full Jest suite, the production build, and the full built smoke suite pass.
- Capability, rollout-matrix, and roadmap documents record the new draft status and the move of `spline-parameterization` to cohort E.
