# Task 9 evidence: A9a (typed vocabulary, review fields, pilot)

Revision: based on `df45cb9` (platform stream, 2026-10-31). A9b, which migrates the remaining content files and deletes the legacy path, is recorded below when it lands.

## Deletion test: knowledge callers no longer restate

- Content no longer translates names: a migrated scene authors `LessonAction` (`src/learning/model.ts`) directly, for example `{kind: 'curve-visibility', target: 'weights', visible: true}` in place of `{name: 'show-weights', value: true}`. The 37-line name-to-method mapping comment is gone; each action's documentation now sits on its `LessonAction` member.
- Each name list is written once with its type derived: `FUNCTION_PARAMETER_NAMES`, `FUNCTION_VISIBILITY_TARGETS`, function choice names (derived from the values record), and the new `CURVE_VISIBILITY_TARGETS`, `PATCH_VISIBILITY_TARGETS` and `CAMERA_PRESET_NAMES`. `lessonCatalog.ts`, `patchLessonActions.ts` and `surfaceMath.ts` stopped keeping their own copies.
- `adaptContent` no longer hard-codes the pilot ids: `isPilotGuidedLesson()` derives them from `pilotGuidedLessons`. Content and runtime share `LocalizedText`, `LessonLocale`, the frame kind and the animation type, so the adapter's `as LocalizedText` casts are gone.
- Legacy string actions still work through `toLessonAction()` for unmigrated files. They are marked `@deprecated — removed by A9b` and live only in `guidedLessons.ts` and `lessonCatalog.ts`, so A9b does not need `model.ts`.

## Review-field decisions

Recorded in [the Guided lessons spec](../../specs/guided-lessons.md#authored-review-fields--decision-2026-10-31): `learnerInteraction` and `sources[].supports` are removed (no reader; optional and deprecated until A9b). Citations, `expectedObservations`, `expectedState` and `step.action`/`frame.action` are kept, each with its reader named.

## Tests and checks

- Typecheck mutation in the pilot `additionalGuidedLessons.ts`: a misspelled kind gives `TS2820 Type '"curve-visibilty"' is not assignable … Did you mean '"curve-visibility"'?`, and a wrong parameter gives `TS2322 Type '"tt"' is not assignable to type '"t" | "offset-distance"'`. Both were reverted. Under the same mutation, the runtime registry also rejected the action in `lessonRestoration.part2` and `lessonCatalog.test.ts`.
- Behavior equality: the runtime lessons for rational-decasteljau, elevation, bezier, decasteljau and ph-cubic, dumped before and after the change, are deep-equal.
- New in `lessonCatalog.test.ts` ("typed and legacy scene actions"): typed passthrough, mixed typed/legacy order, and the `-pilot`/`-guided` id rule. Gap: no mutation of these three assertions was run.
- `just unit src/learning src/graphs/patches`: 1939/1942 passed. All three failures were timeouts under machine overload (lessonRestoration spline-parameterization and circle, `jsxProjection`), and all three passed on a path-filtered rerun with `--maxWorkers=2`. `sceneContentAgainstGraphs` and `lessonMathNotation` passed unchanged.
- `just typecheck` passed. `just lint src/learning src/graphs/base src/graphs/patches tools/learning` passed after one unused-parameter fix.

## Migration script and remaining A9b work

`node tools/learning/migrate-lesson-actions.cjs [--check] [--quiet] <file.ts>...` rewrites literal legacy actions to typed literals and strips the removed fields. It is idempotent: `--check` on the pilot reports "already migrated". Non-literal forms are left in place and reported.

Remaining sites when A9a was accepted (counted by search):
- `action('...')` helper calls: `guidedLessons.ts` 12, `expansionGuidedLessons.ts` 10. The helper is removed only when every call converts.
- Literal `{name: …, value:` actions: spline 25, construction 19, analysis 14, foundation 13, parameterization 10, function 9, rationalConstruction 5.
- `learnerInteraction`/`supports` lines: analysis 89, function 67, spline 37, construction 29, `guidedLessons.ts` 29, foundation 25, rationalConstruction 24, expansion 21, parameterization 16.
- After migration, A9b narrows `LessonSceneAction` to `LessonAction` and deletes `SceneAction`, `SUPPORTED_SCENE_ACTION_NAMES`, `sceneAction()` and `legacyActions()`, including the content-test wrappers. It also updates the iterative-lesson sentence in `docs/current-architecture.md` and the ADR 0013 amendment, which still name the string actions.
