# 9. One typed lesson action vocabulary

Status: A9a accepted 2026-10-31 (vocabulary, review fields, pilot, migration script; evidence in [09-lesson-action-vocabulary.evidence.md](09-lesson-action-vocabulary.evidence.md)); A9b (remaining content, legacy deletion) implemented in `7fe0d6d`, browser walk pending. Lane: Learning. Source: [specification §9](../../specs/architecture-deepening-backlog.md#9-one-typed-lesson-action-vocabulary).

## Scope and entry points

- `src/learning/content/guidedLessons.ts:27-212`: content schema and action names.
- `src/learning/runtime/lessonCatalog.ts:29-190`: `sceneAction`.
- `lessonCatalog.ts:236-268`: `adaptContent`.
- `src/learning/model.ts:19-24, 78-107`.
- `LessonActionRegistry.ts`.
- `LessonSession.ts:154-161`.
- The ten content files.
- ADR 0002.

## Implementation and acceptance

- Content authors the typed runtime actions directly, so that a misspelled action or a wrong parameter fails typecheck. Delete the string name list, its mapping comment and the translation chain.
- Write each parameter and visibility name list once, with the type derived from it.
- Merge the content and runtime scene and frame types where they mean the same thing. Make the `-pilot`/`-guided` id rule data rather than a hard-coded list.
- Decide which authored review fields stay. For example, `learnerInteraction` (253 occurrences, read by nothing), `expectedObservations`, `expectedState` and sources. For each, either a test reads it for a stated reason or it is removed. Record the decision in the Guided lessons spec.
- Decide whether `step.action`/`frame.action` stays: today it runs only from fixtures.
- Lesson behavior is unchanged. The `lessonMathNotation` and scene content tests pass without weakening.
- This is a mechanical content migration across about 2,400 `text(` calls. Script it, and review the diff by search, not by reading it.

## Verification

Run the content, catalog, scene content and lesson restoration tests, typecheck and build. Do a focused browser walk of one lesson per family.
