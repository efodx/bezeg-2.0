# 8. Arc length

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 8

**Dependencies:** [Area between curves](07-area-between-curves.md) (shared foundation and integration files)

**Status:** planned

## Goal

Add the `arc-length` demonstration at `/bezeg-2.0/functions/arc-length` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/arcLength.ts` (polyline length, arc length by adaptive Simpson to 1e-9 using the catalog derivative); `ArcLengthGraph` with endpoints constrained to the graph, polyline with `n` segments (1–100) and vertices, readout; `function-parameter` names `a`, `b`, `n`. Generated segments must be disposed when `n` changes.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 8 to `src/learning/content/functionGuidedLessons.ts` with tests, add `arc-length` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

To be recorded on completion.
