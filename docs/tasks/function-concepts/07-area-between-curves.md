# 7. Area between curves

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 7

**Dependencies:** [Definite integral](06-definite-integral.md) (shared foundation and integration files)

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

## Goal

Add the `area-between-curves` demonstration at `/bezeg-2.0/functions/area-between` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/areaBetween.ts` (signed `∫(g−f)`, unsigned `∫|g−f|` split at intersections or adaptive Simpson to 1e-6, intersections of the two default curves); `AreaBetweenCurvesGraph` with both curves, bounds on the x-axis, mode select, shading, intersection markers, readout; `function-parameter` names `a`, `b`; `function-choice` `area-mode`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 7 to `src/learning/content/functionGuidedLessons.ts` with tests, add `area-between-curves` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

- `npx tsc --noEmit --pretty false`: clean.
- Unit suite: 78 suites, 1042 tests pass (math module `areaBetween.test.ts` with the plan numbers, graph test, lesson test, preset import).
- `CI=false npm run build`: compiled.
- Lesson smoke row (`area-between-curves`, sl + en + narrow viewport): 3/3; `tests/demonstrations.smoke.spec.cjs`: 34/34 after raising the catalog count to 33.
- Worker browser check (throwaway script, removed): SL to EN switch updates board texts, option labels, readout labels and note live, and back.
- Catalog preview regenerated (`area-between-curves.png`, manifest, asset map); no other PNG changed.

New action kinds: none. Reused the parameter names `a`, `b`; added the choice `area-mode` (`under-f|under-g|between`). Bounds lie in [-1, 5]; default bounds are the unrounded intersections `2 -+ sqrt(1.5)`. The signed and unsigned integrals, the intersections and the shading polygons live in `src/analysis/areaBetween.ts`. The unsigned area is always >= 0 and independent of the bound order; every signed value is oriented. The shading is two filled curve objects (second colour where f is on top, or below the axis in the under-f and under-g modes), so the board keeps a constant object count.
