# Task 11: surface lesson runtime evidence

Source: [task 11](../../tasks/bezier-patches/11-surface-lesson-runtime.md), [research and decisions](t11-research.md) (section 11), [spec](../../specs/bezier-patches.md#presets-scene-state-and-lessons).

## Slices

| Slice | Commit | Content |
| --- | --- | --- |
| S1a, S1b | 57fd4d7 | `LessonPoint3`, `LessonPatchFixture`, camera-only `LessonView3D`, `lesson-patch-fixture` prepared scene, shared `patchLessonActions` (evaluation, visibility, subdivide, elevate, camera preset) |
| S2 | 7a0e104 | `patch-u-sweep`/`patch-v-sweep` animations (`patchSweep.ts`), checkpoint/restore of sweeps and ghosts |
| S3 | this continuation | Content bridge: `SceneAction` names `show-patch-point`, `show-patch-element`, `subdivide-patch`, `elevate-patch`, `set-camera-preset`, `run-patch-u-sweep`, `run-patch-v-sweep`; `LessonScene` variant `lesson-patch-fixture`; `sceneAction()`, `patchFixture()`, `view3dFixture()`, `sceneActions()` in `src/learning/runtime/lessonCatalog.ts`; docs |

## Acceptance mapping

| Criterion | Evidence |
| --- | --- |
| Multi-action scenes run synchronously, including edit then evaluate | `src/graphs/patches/lessonPatchScene.test.tsx`, `patchLessonActions.test.tsx`; S3 `src/learning/runtime/patchSceneContent.test.tsx` (content scene: fixture, evaluate, elevate, visibility in one `act`) |
| Elevate/subdivide then read | `patchLessonActions.test.tsx`; S3 content scene reads degrees `(3, 2)` and `(u, v)` |
| Camera then checkpoint/restore | `patchCheckpointSweep.test.tsx`; S3 content scene restores model, drawn scene and camera |
| Invalid inputs | `patchLessonActions.test.tsx` (graph); S3 malformed content rejected (15 payloads, 6 fixtures) |
| Restored model, controls and adapter geometry | `patchCheckpointSweep.test.tsx` (revision, `sceneSignature`, `cameraSignature`, ghosts) |
| Existing curve lesson actions and checkpoints preserved | runtime and content suites green, see results |
| No graph-field state mirrors | no new graph fields; S3 changes only the content layer |
| Content can author the actions | `patchSceneContent.test.tsx` exact mapping per action |

## Tests

`src/graphs/patches/lessonPatchScene.test.tsx`, `patchLessonActions.test.tsx`, `patchCheckpointSweep.test.tsx`, `src/learning/runtime/patchSceneContent.test.tsx`.

## Mutation evidence

- S1a: `replaceState` order mutation failed 4 of 6 tests.
- S1b: five mutations each caught: barycentric sum, split range, degree-4 elevate, tensor `w`, supports-always-true.
- S2: stopSweeps-on-restore, triangular range `[0, 1]`, ghost capture key (each caught).
- S3 (observed in `patchSceneContent.test.tsx`):
  - camera preset mapped to a constant `'front'`: 1 failure (`set-camera-preset "isometric"`);
  - direction check removed: 3 failures (malformed `subdivide-patch`/`elevate-patch`);
  - net size check removed: 1 failure (`rejects malformed fixtures`);
  - prepared scene moved after authored actions: 2 failures (mapping and real-graph run).

## Results (S3, `.command-logs/t11-s3-*.log`)

Predecessor evidence: tsc and vitest on `src/learning/runtime`, `src/learning/content`, `src/graphs/patches`, `src/graphs/base`. The mutation observations above were recorded by that predecessor, not repeated by the Codex continuation.

Codex continuation, 2026-10-29: `just check` passed TypeScript, lint and 4,800 tests in 239 files, then built production successfully. Tested checkout: `12ca8f512889cc68177f7eaf4c5d964e84b17bde` with the S3 content bridge and chapter sections 9–11 dirty. Logs: `.command-logs/2026-10-29T07-49-48-815Z-33736-b3cccf23.log` and build `.command-logs/2026-10-29T07-53-17-887Z-33736-9255e7f6.log`. Build warnings include the existing JSXGraph direct-eval warning; no build failure.

Independent [engineering review](t11-codex-engineering-review.md) and [mathematical review](t11-codex-math-review.md) found no blocking defects. Their focused test runs passed. The mathematical reviewer identified an optional bridge-test improvement: independently assert triangular fixture slots against canonical tuples; current mapping preserves order and kernel/lattice tests cover canonical indices. This remains an explicit test-coverage limitation, not a known mapping defect.

## Browser acceptance — Codex continuation

The full selected shared-runtime baseline passed in [browser smoke](t11-codex-smoke.md): 95 selected Playwright checks plus direct dragging, preset round-trip/deletion and completion-edit checks. Midway chapter return restored reading position and invocation focus; completion left the graph editable. The tests exercised the production build above; later chapter-only prose repairs do not change the reviewed runtime.

Task 11 is complete. No chapter content uses the new patch scene actions yet; authoring and end-to-end patch lesson walks remain task 13. The browser run used existing curve lessons to exercise the shared runtime and does not certify physical devices or hosted deployment. The canonical bridge-test limitation above remains explicit.
