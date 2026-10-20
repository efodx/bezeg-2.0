# Give the Chapter activity visit one owner

**Source spec:** [Architecture deepening, section 1](../../specs/architecture-deepening.md#1-chapter-activity-visit-ownership)
**Status:** implemented on 2026-10-20; acceptance evidence below.
**Priority:** first recommendation.

## Goal

Deepen the visit module so its interface hides snapshot and transition coordination. Improve locality for navigation policy and leverage for tests, while retaining graph-owned scene behavior and an explicit browser adapter.

## Scope and sequence

1. Read the source spec's six acceptance criteria and the navigation table in [standalone learning](../../specs/standalone-learning.md#navigation-and-transient-state). Inspect `useChapterActivity.ts`, `navigationMemory.ts`, `ActivitySession.ts`, `ChapterPage.tsx`, and their workspace callers. Establish the current ownership and preserve local lesson graph-access changes.
2. Identify which knowledge callers must currently share: snapshot writes, activity versus ordinary return, predecessor validation, retry operations and departure. Choose the visit seam without prescribing interface names in advance. Apply the deletion test to avoid extra shallow modules.
3. Concentrate visit policy and snapshot ownership. Keep native history/reading DOM work with the browser adapter, graph operations with their owner, and the Pages redirect bridge separate.
4. Preserve every navigation-table row, query/hash handling, language-switch behavior, error recovery and board disposal. Serialize changes with [scene recovery](03-scene-recovery.md).
5. Verify through the caller interface and record how much coordination was removed. Update ownership documentation after the implementation settles.

## Verification and completion

- Map each source-spec criterion to observed evidence. Start with `just --list`; run focused chapter activity, workspace and reading-return tests, including the existing `useChapterActivity.test.tsx` journeys and history-entry bridge coverage where relevant.
- Exercise Back/Forward, deep link/refresh, reset, free exploration, ordinary-scene return, failure/retry, independent activity snapshots, language changes and departure. Verify graph state as well as visible controls.
- Apply the source spec's browser-verification rule; retain actual browser evidence for history, reading focus/scroll and disposal when those paths change. Report unverified coverage.
- Record final ownership, checks, compatibility impact and any consequential decision. Commit and push only this task's verified changes under AGENTS.md.

## Completion evidence

`ChapterActivityVisit` now owns private activity/ordinary snapshots, reading and predecessor state, launch/return policy, retry targets and departure cleanup. `navigationMemory.ts` retains explicit browser history/reading effects and pure marker encoding/validation. `ActivitySession` and the Pages bridge retain their separate responsibilities. Chapter/workspace callers no longer coordinate mutable scene maps or reading-launch write ordering.

See the [criterion-by-criterion implementation and verification record](../../reviews/chapter-activity-visit.md), including independent review, failure/retry regression tests and actual browser coverage. No routes, Preset formats or persistent storage changed.
