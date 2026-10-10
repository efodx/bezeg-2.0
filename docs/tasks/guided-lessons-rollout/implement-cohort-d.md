# Implement Cohort D Guided lessons

**Source spec:** [Guided lesson content expansion blueprint](../../specs/guided-lessons-content-expansion.md), Cohort D implementation contract

**Dependencies:** [Cohort C](implement-cohort-c.md); the data-driven lesson smoke spec that replaces the per-cohort specs

**Status:** ready; implementation not started

## Goal

Add draft Guided lessons for `subdivision`, `repeated-subdivision`, `rational-subdivision`, `extrapolation`, and `rational-extrapolation` in one batch. The lessons depend on generated-curve ownership and are verified by a single browser smoke pass.

## Slices

Slices 1–3 run in parallel. Slice 4 waits for them.

1. **Subdivision seam** owns `src/graphs/curves/bezier/SubdivisionGraph1.tsx` (also used by `RationalSubdivisionGraph2`), the rational subclass if needed, tests, and four `LessonAction` variants in `src/learning/model.ts`:
   - `{kind: 'subdivision-parameter'; value: number}`
   - `{kind: 'subdivide'}`
   - `{kind: 'extrapolation-parameter'; value: number}`
   - `{kind: 'extrapolate'}`

   Own and rebind the orange remainder curve across scene preparation and restore, keep the scheme switch in sync with state, and test both the polynomial and the rational split identities.
2. **Repeated subdivision seam** owns `src/graphs/curves/bezier/SubdivisionGraph.tsx` and its test. Handle `subdivide` with the five-step cap, include `stepsDone` in the lesson checkpoint and reset it in the default scene, and remove the leftover `console.log`. Test the `2^k` curve count, coverage of the original curve, and the decreasing distance from polygon to curve.
3. **Extrapolation seam** owns `src/graphs/curves/bezier/ExtrapolationGraph.tsx`, `src/graphs/curves/rational/RationalExtrapolationGraph.tsx`, and their tests. Handle the parameter and extrapolate actions, recreate the extrapolation point in the prepared scene, test $E(u)=B(tu)$ for both, and check the rational weights against the contract: one becomes negative above $t\approx1.366$, while the original denominator stays positive, so there is no pole.
4. **Content and integration** owns a new `src/learning/content/constructionGuidedLessons.ts` and its test, scene-action mapping, registration, allowlist, catalog-count tests, and new route rows in the data-driven lesson smoke spec. Each lesson has 4–6 steps, Slovenian first, with delimited inline math and worked values recomputed in tests.

## Acceptance criteria

- Blueprint route-level criteria 1–4 and 6 pass for all five routes; criterion 5 owner language and classroom review stay pending.
- Exit restores exactly the pre-lesson curve set, control points, weights, parameters, and repeated-subdivision step count; repeated entry and exit leave no generated curves or stray auxiliary objects.
- Routes, Preset identifiers, stored presets, import/export formats, and subdivision/extrapolation algorithms are unchanged.
- `npx tsc --noEmit --pretty false`, the full Jest suite, the production build, and one full built smoke run pass.
- Capability, rollout-matrix, and roadmap documents record the draft status.
