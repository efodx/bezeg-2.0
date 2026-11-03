# BS-C-3: the L5 NURBS and circle lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L5](../../specs/b-splines-nurbs-lessons.md). Date 2026-11-03; implemented by a Sonnet worker, not yet verified by the handler.

## What changed

- New lesson action `nurbs-circle` (`src/learning/model.ts`): `set-example` (`circle`|`unit`), `set-t`, `set-weight` (zero-based index, value), `set-circle`, `reset`. `BSplineNurbsGraph` registers it and calls the control setters (`selectExample`, `setT`, `setWeight`, `setShowCircle`, `resetToOrigin`). An unknown example, a `t` off the domain or non-finite, an index not an integer in range, a nonpositive or non-finite weight (the refusal reason is the error) or a non-boolean overlay flag throws. `lessonDefaultState` is unchanged.
- L5 guided lesson `src/learning/content/bsplineNurbsGuidedLessons.ts`, six steps on lesson-fixture scenes: predict (unit weights, error about 6.07e-2); the polynomial version at t = 1/8 (0.75, 0.75); four `set-weight` actions to sqrt2/2 give error below 1e-12; predict the angle at t = 1/16 (0.92979, 0.36809) at 21.598 degrees; one curve vs four arcs (text only, with the acceptance 5 wording in both languages); free exploration.
- The `b-splines` chapter gains its fifth section `bspline-nurbs` (ownership, registry, chapter, chapter test; the "later lessons not named" list now holds only blossom words); preview copy, catalog, coverage (118) and preview-copy (104/111) counts, notation registration, `CHAPTER_LINK_PENDING`, the lesson opt-out expectation (`[]`) and a smoke row. `lesson: false` removed from `bspline-nurbs`. No route or Preset changed.

## Checks (worker, at e0911cac plus the working tree)

- `just typecheck`, `just lint` (changed ts/tsx), `just build` passed; `just unit src/learning src/demonstrations src/graphs/curves/bspline src/localization`: 119 files, 1983 tests passed; `just smoke-lesson bspline-nurbs` passed.
- Mutations against `bsplineNurbsGuidedLessons.test.tsx` (11 tests): `set-example` no-op failed 1, `set-t` 2, `set-weight` 3, `set-circle` 1, `reset` 2.

## Gaps and flags

- The graph has no knot editor, so step 6 explores weights only (the spec says "a weight and a knot").
- The spec's angle tolerance 1e-4 cannot hold against the quoted 21.598 (the exact value is 21.59816...); the test compares to an independent unrounded value at 1e-4 and to 21.598 at 5e-4.
- Smoke row has no hooks; the browser walk beyond `smoke-lesson` and the Slovenian wording were not reviewed.
