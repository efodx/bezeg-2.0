# Deepen visit, preview capture, and scene recovery modules

**Status:** all three tasks implemented and verified on 2026-10-20. See [visit acceptance](../reviews/chapter-activity-visit.md), [preview capture acceptance](../reviews/preview-capture-interface.md), and [scene recovery completion](../tasks/architecture-deepening/03-scene-recovery.md#completion-evidence). The original investigation briefs below are historical implementation inputs, not open work.
**Source:** architecture review of 65 recent commits and focused source/test inspection, initially presented as a temporary HTML report on 2026-10-20. The durable scope and evidence are recorded here.
**Contracts:** [guardrails](../guardrails.md), [standalone learning](standalone-learning.md), [Guided lessons](guided-lessons.md), [representative previews](representative-demonstration-previews.md), and [continuous motion previews](continuous-motion-previews.md).

## Purpose and scope

Concentrate existing coordination behind modules with more depth: callers learn fewer rules, maintainers gain locality, and tests gain leverage through the same interface callers use. These are source-backed opportunities, not confirmed defects or measured performance problems.

Prepare and carry out three bounded tasks independently. Do not prescribe method names or introduce a generic framework in advance. Apply the deletion test: an extraction must concentrate complexity rather than move it into more shallow modules. Keep an adapter only where behavior actually varies; do not invent a second renderer, router, or chapter to justify a seam.

| Task | Recommendation | Primary outcome |
| --- | --- | --- |
| [Chapter activity visit ownership](../tasks/architecture-deepening/01-chapter-activity-visit.md) | Strong; first choice | One owner for visit policy and snapshots, with browser effects kept explicit. |
| [Demonstration preview capture and evidence](../tasks/architecture-deepening/02-preview-capture-evidence.md) | Worth exploring | Reduce the knowledge exposed by the capture module while preserving mathematical evidence. |
| [Lesson scene recovery](../tasks/architecture-deepening/03-scene-recovery.md) | Worth exploring; test first | Verify recovery semantics, then consolidate mechanics only if both existing callers become simpler. |

## 1. Chapter activity visit ownership

### Evidence and direction

`src/learning/chapter/useChapterActivity.ts` imports a broad memory surface and coordinates snapshot writes, retry state, rollback, history traversal and departure. `navigationMemory.ts` exposes mutable snapshot maps beside visit flags and also performs native history writes and reading focus/scroll effects. `ChapterPage.tsx` coordinates launch ordering; `DemonstrationWorkspace.tsx` consumes return context.

Deepen the visit module so its interface hides coordination policy. Keep router and reading DOM effects with their adapter, and graph scene work with the graph owner. The existing `ActivitySession` has useful depth: deleting it would spread scene sequencing into callers. Preserve that depth rather than absorbing unrelated graph behavior into navigation.

### Acceptance criteria

1. Visit snapshot and transition policy has an explicit owner; chapter/workspace callers no longer coordinate exposed mutable snapshot maps or reconstruct the same transition rules independently.
2. Every navigation row in the standalone-learning contract retains its behavior: actual Back/Forward history, reading position/focus, independent activity snapshots, ordinary-scene return, reset, free exploration, deep links and refresh notices.
3. Invalid context and markers are rejected without losing unrelated query/hash values. Language changes and unrelated renders do not replay authored scenes.
4. Capture/restore failure preserves the last valid scene; retry repeats the intended operation; impossible recovery disposes the failed graph. Departure always releases the board.
5. Snapshots remain visit-local, never entering Presets, URLs or persistent progress. The Pages history-entry bridge remains a hosting concern.
6. Tests exercise the visit interface and retain integration coverage for browser effects; the change demonstrates reduced caller coordination, not merely redistributed functions.

## 2. Demonstration preview capture and evidence

### Evidence and direction

`scripts/demonstration-preview-motion.cjs` assembles family specifications and a shared helper bundle, drives drag/sweep capture, dispatches capture, validates evidence and exports many mathematical helpers alongside a mutable registry. Family mathematics already lives partly in `demonstration-preview-{analysis,curve,concept}-motion.cjs`. Some evidence tests temporarily mutate the registry.

This module already earns depth across 45 timelines. Preserve capture/evidence parity and mathematical locality while reducing what callers must understand. Keep supported browser input and real-board observation with the capture adapter. Moving functions into more files alone does not meet this goal. Atomic publication already has useful locality and is not a separate redesign target.

### Acceptance criteria

1. Capture callers and evidence tests use a deliberate interface that does not require learning unrelated mathematical helpers or mutating the production registry to install test fixtures.
2. Schedule, supported input, observation and mathematical checks remain traceable for every timeline; live capture and offline evidence validation retain shared checks.
3. All 45 Demonstrations retain their supported capture paths and coverage, including continuous sweeps, pointer drags and exact stepped states. Camera, readout, mathematical, source-frame loop and media budget checks remain enforced.
4. Selective recapture preserves retained media/evidence; failed validation, encoding, publication or pruning leaves the prior published set intact. Provenance and manifest/map consistency remain valid.
5. Tests retain independent mathematical rejection cases and verify the consumer interface. Representative real capture and decoded-media evidence establish that the browser adapter still matches live routes.
6. Preview tooling remains capture-only and the runtime player remains graph-free. No lesson action coupling, runtime default changes or renderer migration.

## 3. Lesson scene recovery

### Evidence and direction

`ActivitySession.transact` captures rollback state and distinguishes recovery failure; ordinary return in `useChapterActivity.ts` repeats capture/restore recovery; `LessonSession.applyActions` restores the lesson entry checkpoint on action failure. These are related mechanics with different policies. Both sessions already have depth.

The inspected `LessonSession.test.ts` action-failure case makes the first action throw; it does not establish recovery after an earlier action mutates state. `activities.test.ts` already exercises partial-scene and capture failures. Start by establishing caller-visible behavior, including synchronous dependent actions. Explore a recovery seam only after the common mechanics and intentional differences are clear.

### Acceptance criteria

1. Tests establish that a later action sees an earlier action's state write in one synchronous sequence, and that a later failure rolls back the earlier mutation.
2. The verified behavior distinguishes lesson entry restoration from activity recovery to the last valid scene, including no-scene/empty-scene behavior and successful lesson completion.
3. Coverage addresses unavailable/disposed graphs, capture failure, restore failure, rollback failure, and pause versus stop semantics without mutating a dead board or persisting playback state.
4. Any shared recovery module demonstrably reduces coordination for at least two existing callers while retaining each caller's checkpoint policy and graph adapter ownership. Do not introduce a generic transaction framework.
5. If consolidation offers no depth, finish with the targeted tests and record the evidence-based decision in the task. A new shared module is not a completion requirement.
6. Preserve synchronous scene actions, deferred host board effects, graph ownership, disposal and Preset isolation.

## Sequencing, decisions and verification

Start with task 01. Task 02 has separate source ownership and may proceed independently. Tasks 01 and 03 share chapter orchestration code: serialize their changes and reassess task 03 after visit ownership settles. Coordinate with existing lesson graph-access work before changing its consumers; preserve unrelated local edits.

Respect ADRs [0002](../adr/0002-guided-lessons-static-content-and-graph-capabilities.md), [0003](../adr/0003-frame-based-graph-anchored-lesson-overlay.md), [0006](../adr/0006-model-input-ownership-before-renderer-migration.md), [0013](../adr/0013-iteration-driven-by-scene-actions.md), and [0014](../adr/0014-study-chapters-share-demonstrations.md). No reversal is proposed. Document consequential choices with real alternatives in an ADR; use the glossary only for domain vocabulary.

For implementation, start with `just --list` and select focused checks from [commands](../commands.md). Use mathematical checks for affected capture/scene operations. Apply `$smoke-tester` and the [browser checklist](../smoke-tests.md) when behavior or interaction paths change; shared workspace or lesson-runtime changes require the full checklist. Behavior-preserving changes sufficiently covered by unit tests do not require smoke testing under AGENTS.md. Record actual checks and gaps, not inferred passes. Update architecture guidance when ownership changes, and record any route or Preset compatibility impact.

Preparing these Markdown documents requires link/content review and whitespace checks, not application builds or browser smoke tests.
