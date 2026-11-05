# BS-C-L6d: the L6 blossoming lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L6](../../specs/b-splines-nurbs-lessons.md). Date 2026-11-05; implemented by a Sonnet worker (handler 42), integrated by the handler.

## What changed

- New lesson action `blossom` (`src/learning/model.ts`): `set-degree`, `set-segment`, `set-args`, `set-bezier`, `reset`. `BSplineBlossomGraph` handles it in `applyBlossomAction` with its own setters (`setDegree`, `setSegment`, `setArgument`, `setShowBezier`, `resetToDefaults`). An unsupported degree, an empty or unknown segment, a wrong argument count, an argument off the domain or a non-boolean flag throws.
- L6 guided lesson `src/learning/content/bsplineBlossomGuidedLessons.ts`, six steps on the L2 example: (1) predict \(f(0,1)=(1,2)\); (2) \(f(\tfrac14,\tfrac34)=(1,1.625)\) by two interpolations; (3) \(f(\tfrac12,\tfrac12)=(1,1.5)=C(\tfrac12)\); (4) the swapped pair \((\tfrac34,\tfrac14)\) gives the same point; (5) Bézier points \((0,0),(1,2),(2,2)\) of \([0,1)\); (6) free exploration. Outside the segment the text claims no inequality (the default curve is one parabola).
- The `b-splines` chapter gains its sixth section `bspline-blossom`; preview copy (107/114 after the rebase onto conic-focal), coverage (121), notation registration, smoke row; `lesson: false`, the `CHAPTER_LINK_PENDING` entry and the lesson opt-out removed. No route or Preset changed.

## Checks

- Worker: `npx tsc --noEmit`, `just lint` (changed files), `just build`; scoped unit run 2008 passed; full `just unit` 558 files, 10999 passed, 1 failed; `just smoke-lesson` for bspline-blossom passed. The one failure (`guidedExamplePreviews.test.ts`, the geometric-series card) is pre-existing on `master`: the handler reproduced it at 9d725fb6 with the L6c commit reverted.
- Mutations against `bsplineBlossomGuidedLessons.test.tsx` (11 tests): `set-args` writing only index 0 failed 6, `set-segment` no-op 1, `set-degree` no-op 1, `set-bezier` inverted 2, `reset` no-op 1.
- Sonnet review (scene actions, quoted values, notation, registration): no findings; every quoted value recomputed by hand.
- Sonnet browser walk (chapter /bezeg-2.0/learn/b-splines → "Vodeni primer"): sl 1440×900 and en 390×844, 14 frames, every readout matches the text, no console errors; at 390 the card covers the board (the known shared-runtime issue). The markers themselves were hidden under the card, so they were checked through the inspector readouts.
