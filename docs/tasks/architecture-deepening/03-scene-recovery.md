# Verify and concentrate Lesson scene recovery

**Source spec:** [Architecture deepening, section 3](../../specs/architecture-deepening.md#3-lesson-scene-recovery)
**Status:** implemented and verified on 2026-10-20.
**Priority:** worth exploring; test first, after visit ownership settles.

## Goal

Establish caller-visible recovery behavior, then deepen shared mechanics only if the interface gives existing callers more leverage and improves locality. Preserve each graph adapter's ownership and the useful depth already present in both session modules.

## Scope and sequence

1. Read the source spec's six acceptance criteria and ADRs 0002, 0003 and 0013. Inspect `LessonSession.ts`, `ActivitySession.ts`, ordinary-return recovery in `useChapterActivity.ts`, the capability model and existing tests. Reassess after [visit ownership](01-chapter-activity-visit.md); do not edit the shared hook concurrently.
2. Add targeted tests for multiple synchronous actions: a later action reads an earlier state write, and a later failure rolls back an earlier mutation. Keep the sequence within one tick.
3. Establish intentional differences: lesson entry checkpoint versus activity last-valid-scene recovery, successful completion, empty/absent scenes, pause/stop, disposed graphs and rollback failure. Verify state and board ownership, not just call counts.
4. Apply the deletion test to proposed consolidation. Introduce a recovery seam only if at least two existing callers need the same mechanics and both become simpler; retain their distinct checkpoint policy. Do not build a generic transaction framework or graph-field mirrors.
5. If tests show that current modules already provide sufficient depth, retain them and record why consolidation was rejected. Targeted verification and a documented disposition can complete this task.

## Verification and completion

- Start with `just --list`; run focused `LessonSession`, chapter activity, scene-store and graph/control tests appropriate to the final change.
- Cover partial mutation, capture/restore failure, rollback failure, disposed graphs and synchronous dependent actions. Preserve Preset isolation and stopped/paused animation behavior.
- Apply the source spec's browser-verification rule if shared lesson runtime or interactions change. Test-only work does not require smoke tests; report coverage accurately.
- Record the chosen disposition, evidence and any remaining risk. Update architecture guidance only if ownership changes. Commit and push this task's verified work under AGENTS.md.

## Completion evidence

### Disposition

Retain `LessonSession`, `ActivitySession` and visit-owned ordinary return. After task 01, ordinary-return recovery belongs to `ChapterActivityVisit`, not the hook. Lesson failure restores the lesson-entry checkpoint; activity failure restores the scene immediately before the operation; ordinary return retains its saved reading scene for retry. Activity capture pauses without stopping/resetting its current frame. Lesson scene replacement stops transient work.

A shared capture/try/restore helper would need checkpoint, animation and error-policy parameters while leaving navigation retry/disposal with the visit adapter. It would move a few statements without removing either caller's coordination knowledge. The deletion test therefore favors the existing deep session interfaces. No generic recovery module, new state mirror or ownership change was introduced.

The real-board regression exposed one adapter defect: within one tick, a De Casteljau action changed the drawn parameter from `0.25` to `0.75`, then rollback restored model `t = 0.25`. The host saw the same initial/final parameter and left the drawing at `0.75`. `DecasteljauGraph.restoreLessonState` now explicitly reconciles its existing drawn parameter and clears stale animation publication state after restore. A readiness guard also prevents the subclass from writing state before the base adapter rejects a disposed graph.

### Acceptance mapping

| Source criterion | Evidence |
| --- | --- |
| 1. Synchronous dependencies and partial rollback | Lesson and activity tests record values observed by later actions outside rollback state; activity failure restores edited pre-operation state. The real-host test proves the actual curve parameter returns to the checkpoint in the same synchronous sequence. |
| 2. Distinct checkpoint policies | Lesson entry restore, absent and explicit empty scenes, final non-original scene on completion and explicit close; activity reset versus saved-visit resume; ordinary return rolls partial restore back and retries its saved reading scene. |
| 3. Failure/lifecycle/animation | Capture, restore and rollback failure tests; unavailable activity rejects before pause/capture/mutation; disposed lesson close and direct graph restore; activity capture pauses without stop. Existing host/animation tests and Chromium playback checks cover cancellation. |
| 4–5. Consolidation decision | Existing callers retain their different recovery policies; no shared seam passed the deletion test described above. |
| 6. Ownership, synchronous state and Presets | Real JSXGraph/GraphHost test keeps the same board, checks nonempty board objects and restored curve parameter, proves batched host effects, and observes no storage writes. SceneStore, host, graph-session, control and Preset suites pass. |

### Verification

- `just --list` before implementation.
- Focused `just unit` run: **131 tests across 14 files passed**, covering LessonSession, GuidedLesson, activities, ChapterActivityVisit, useChapterActivity, SceneStore, GraphHost, GraphHostRealGraph, GraphSceneReload, GraphSession, GraphControlledControls, GraphPresetsAndDisplay, DecasteljauGraph and BisectionGraph. After strengthening the real-host observation assertion, its three tests passed again.
- `just typecheck` passed. The initial test-only return-type error was corrected before acceptance.
- `just build` passed with recorded provenance. The final build is logged at `.command-logs/2026-10-20T19-21-36-124Z-36356-222235b5.log`. Warnings concern the existing classic history bridge script, Bootstrap Sass declarations, large bundles and JSXGraph's parser `eval`.
- Focused Chromium checks for lesson/activity scene ownership and playback pause: **2 passed** (`2026-10-20T19-20-32-724Z-34308-a1a8010d.log`).
- `just smoke-built tests/standalone-learning.smoke.spec.cjs tests/lesson-graph-access.smoke.spec.cjs tests/workflows.smoke.spec.cjs --port 4389 --workers=3`: **19 passed**. Covers all six authored activities, reading/Forward/reset/refresh, ordinary-scene isolation, lesson exit, touch, narrow/200% text, keyboard, language retention and Preset save/reopen. Log: `.command-logs/2026-10-20T19-21-46-562Z-24060-6ce73dc1.log`.
- Independent mathematical/state and engineering reviews found no actionable code defects. Their documentation and browser-evidence gaps are closed by this record and the Chromium runs.

### Limits and compatibility

The delegated in-app browser timed out against a sandboxed preview; after loopback access was repaired, that worker's browser inventory was empty. Handler-run Playwright Chromium supplied the browser evidence above with network-enabled execution. Manual visual review, physical touch devices, classroom projection and the full browser checklist were not run. The shared lesson runtime and workspace are unchanged, so focused affected-path checks were selected.

Fault injection covers partial mutation and impossible rollback at unit/real-host level, rather than exposing failure controls in the product. A lesson rollback failure still propagates the graph adapter's error; activity/ordinary rollback failure retains its typed fatal error and the existing hook disposal path. No routes, Preset formats, persistent storage or architectural ownership changed.
