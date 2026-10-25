# 00. Prepare bounded lesson geometry and views

**Source spec:** [Scope, acceptance, and verification](../../specs/lesson-example-improvements.md)

**Status:** implemented 2026-10-24 (handler); accepted 2026-10-25 (task 09, [acceptance](../../reviews/lesson-example-improvements/acceptance.md)). **Dependencies:** none. **Owner:** handler.

## Work

1. Inspect how prepared scenes currently load demonstration defaults, reset graph state, and restore checkpoints. Inventory the geometry/view needs of tasks 01–05 before selecting the smallest extension.
2. Reuse existing capabilities where sufficient. If they cannot prepare lesson-specific control points, PH generators, spline inputs, or a view, add only the typed, validated graph-owned preparation operations required by those tasks. Record each operation's consumers and supported domains. Avoid a generic editor, persistent lesson presets, graph-global mirrors, or a new scene framework.
3. Keep free-exploration defaults independent of lesson fixtures. Ensure a later action in one synchronous scene can read state written by an earlier action. Dispose replaced constructions, listeners, and sample objects through existing ownership.
4. Define who owns each shared vocabulary/adapter change and give downstream tasks the settled interface. Preserve ongoing lesson-overlay work in the checkout; this task does not redesign the overlay.

Entry points: `src/learning/content/guidedLessons.ts`, `src/learning/model.ts`, `src/learning/runtime/lessonCatalog.ts`, `src/graphs/base/lesson/`, `src/graphs/base/BaseCurveGraph.tsx`, and graph-specific `prepareLessonDefaultScene` implementations. Search before expanding reads.

## Acceptance and checks

- Tasks 01–05 can prepare their required scenes deterministically without rewriting stored user presets or adding new routes.
- New inputs reject unsupported shapes/values with an actionable error; invalid preparation does not leave a partially replaced scene.
- Unit-test meaningful multi-action sequences in one tick, repeated preparation, and checkpoint restore for each new capability. Account for ownership/disposal and cache freshness where geometry is replaced.
- Verify Back/Next, exit/re-entry, Reset, language switch, preset restore, and paused animation behavior for a representative consumer of each new capability.
- If no extension is needed, close with concrete existing entry points and evidence for every downstream requirement; do not add unnecessary code.
- Run focused unit checks, typecheck/build, and the full applicable lesson-runtime browser checklist if shared runtime behavior changes. Record evidence and gaps as described in the [task index](README.md).

## Outcome

Existing capabilities covered function lessons and default-scene resets but could not prepare lesson-specific curve geometry or a view. One typed operation was added:

- `LessonAction` `{kind: 'prepared-scene', sceneId, source: 'lesson-fixture', curve: LessonCurveFixture, view?: LessonViewBox}` in `src/learning/model.ts`. The fixture holds `points`, optional `weights`, `hodographs` (PH generating point is the single `points` entry), `degree`/`continuity` (generic spline) and `splineRatios` (G1 junction ratios).
- `BaseGraph` builds the graph's own Preset data through `lessonFixtureData`, checks it with the graph's Preset collection and the view box before replacing anything, then imports it, resets scene state as the default scene does, applies the view if given, and finishes the scene replacement synchronously. Graphs without support reject the action with `UnsupportedLessonActionError`.
- `BaseCurveGraph.lessonFixtureData` keeps the default scene's single curve type and display state and replaces only the fixture inputs; default G1 ratios are dropped unless given, since they fit only the default point count.
- Consumers: tasks 01–05 (all single-curve curve demonstrations). Free-exploration defaults, Reset and stored Presets are unchanged; checkpoints capture fixture scenes through the existing exported Preset data. Rational weights may be changed by a fixture with the same points; only `farin` also supports `rational-weights`.

Evidence: `src/graphs/base/lessonFixtureScene.test.tsx` on real graphs (Bézier fixture and view, same-tick follow-up action reading fixture state, PH and G1 fixtures, five rejected fixtures leaving the scene unchanged, repeated preparation and checkpoint restore, unsupported graph). The first run failed on a real defect (an emitted empty curve state), which shows the scene assertions are not vacuous.
