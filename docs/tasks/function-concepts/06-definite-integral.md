# 6. Definite integral

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 6

**Dependencies:** [Derivative](05-derivative.md) (shared foundation and integration files)

**Status:** implemented

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

- `npx tsc --noEmit --pretty false`: clean.
- Unit suite: 76 suites, all tests pass (math module `riemann.test.ts` with the plan numbers, graph test, lesson test, preset import).
- `CI=false npm run build`: compiled, no new warnings.
- Lesson smoke row (`definite-integral`, sl + en + narrow viewport): 3/3; `tests/demonstrations.smoke.spec.cjs`: 33/33 after raising the catalog count to 32.
- Worker browser check (throwaway script, removed): SL to EN switch updates board texts and inspector labels live; n slider up to 150 does not add board objects; sin on [0, 2 pi] draws positive and negative shapes in different palette colours; swapped bounds flip the sign.
- Catalog preview regenerated (`definite-integral.png`, manifest, asset map); no other PNG changed.

New action kinds: none. Added the parameter name `b` (`a` and `n` reused) and the choices `integral-function` (`square|sin|exp`) and `sum-method` (`left|right|midpoint|trapezoid`). Bounds lie in [-7, 7] (so that 2 pi is selectable); the sums, shapes and exact integral live in `src/analysis/riemann.ts` and are reusable by concept 7 (shapes are drawn as two filled curve objects whose point lists are rebuilt in `updateDataArray`).

View: each function has its own default view (`FUNCTION_VIEWS` in `DefiniteIntegralGraph.tsx`), applied on every function change (inspector select and the `integral-function` action) and for the default scene; a view stored in a preset still wins. The derivative route keeps the view on function change; this one deliberately resets it because the lesson's last step needs sin on [0, 2 pi]. Boxes have about the workspace aspect (1.27), and the drawn function path leaves out values more than a quarter view height outside the view, so the catalog preview frames the default scene tightly.
