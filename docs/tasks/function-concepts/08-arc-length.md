# 8. Arc length

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 8

**Dependencies:** [Area between curves](07-area-between-curves.md) (shared foundation and integration files)

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

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

- `npx tsc --noEmit --pretty false`: clean.
- Unit suite: 80 suites, 1092 tests pass (math module `arcLength.test.ts` with the plan numbers, graph test, lesson test, preset import).
- `CI=false npm run build`: compiled.
- Lesson smoke row (`arc-length`, sl + en + narrow viewport): 3/3; `tests/demonstrations.smoke.spec.cjs`: 35/35 after raising the catalog count to 34.
- Worker browser check (throwaway script, removed): SL to EN switch updates board texts, readout labels, inspector help and note live, and back; dragging B moved it along the graph (x rounded to 0.01) and updated the readouts; board object count stayed 34 for n = 2 and n = 100.
- Catalog preview regenerated (`arc-length.png`, manifest, asset map); no other PNG changed.

New action kinds: none. Reused the parameter names `a`, `b`, `n`. Endpoints lie in [-7, 7], n in 1-100; default `[0, pi]` (b stored unrounded), n = 2. Lengths are never negative and independent of the order of a and b (`|b - a|`), unlike the oriented integral of the definite-integral demonstration. The polyline is one curve object and its vertices are one more (small filled octagons of constant pixel size separated by NaN), so the object count does not depend on n.
