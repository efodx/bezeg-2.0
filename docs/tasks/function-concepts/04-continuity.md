# 4. Continuity

**Source spec:** [Function and calculus concepts](../../specs/function-concepts.md) — lesson plan 4

**Dependencies:** [Trigonometric functions](03-trigonometric-functions.md) (shared foundation and integration files)

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

## Goal

Add the `continuity` demonstration at `/bezeg-2.0/functions/continuity` to the functions family, then its Guided lesson.

## Part A — support code

`src/analysis/continuity.ts` (left value, right limit, jump, continuity test with 1e-9 tolerance, one-sided slopes); `ContinuityGraph` with the two pieces, filled and open points coloured by continuity, slider `a`, readout; `function-parameter` name `a`.

Also: register the demonstration in `src/demonstrations.ts` and `src/Routes.tsx`; add its preset collection to `PresetImport.ts` with domain checks; add localization keys to `sl.ts` and `en.ts` in lockstep; extend the closed name unions in `src/learning/model.ts` and the catalog adapter validation only with the names listed above; update count assertions.

## Part B — lesson

Add the lesson from plan 4 to `src/learning/content/functionGuidedLessons.ts` with tests, add `continuity` to `GUIDED_LESSON_AVAILABLE_IDS`, and add its row to `tests/guided-lessons.smoke.spec.cjs`.

## Acceptance criteria

Spec acceptance criteria 1–8 for this concept, including the plan's worked-example numbers as unit tests and a synchronous multi-action scene test.

## Verification

- `npx tsc --noEmit --pretty false`: clean.
- Unit suite: 72 suites, 853 tests pass.
- `CI=false npm run build`: compiled.
- Lesson smoke row (`continuity`, sl + en + narrow viewport): 3/3; `tests/demonstrations.smoke.spec.cjs`: 31/31 after raising the catalog count to 30.
- Worker browser check: SL→EN switch updates board texts, slider value and inspector readouts live; status "zvezna pri x = 1" / "skok 1 pri x = 1" and English counterparts.
- Catalog preview regenerated (`continuity.png`, manifest, asset map); no other PNG changed.

No new action kind: `function-parameter` `a` already existed. Points are coloured with `GraphPalette.primaryCurve` (match) and `constructionLevels[5]` (mismatch); the status text carries the same meaning.
