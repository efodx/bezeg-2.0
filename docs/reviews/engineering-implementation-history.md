# Engineering implementation history

This record preserves unique evidence and provenance from completed implementation handoffs retired during the 2026-10-24 planning-record cleanup. Current contracts and acceptance outcomes remain in the linked specs, reviews and ADRs. Historical task briefs were execution instructions and are no longer active work.

## Architecture deepening

The chapter-activity visit and preview-capture handoffs are covered by the durable [visit acceptance](chapter-activity-visit.md) and [preview-capture acceptance](preview-capture-interface.md) reviews. The scene-recovery work passed its focused unit, typecheck, build, Chromium and standalone-learning smoke checks on 2026-10-20; the source spec records the retained checkpoint policies and validation. A real GraphHost/JSXGraph rollback exposed a drawing that stayed at `t = 0.75` after model state returned to `t = 0.25` in the same tick. `DecasteljauGraph.restoreLessonState` now reconciles the drawing and clears stale animation publication state. The readiness guard also prevents writes through a disposed graph adapter. No route, Preset format or ownership changed. See [architecture-deepening](../specs/architecture-deepening.md) and its [scene-recovery evidence](../specs/architecture-deepening.md#3-lesson-scene-recovery).

## React architecture refactor

All seven implementation slices completed on 2026-10-13. The recorded commits are `63af46b`, `430a7e1`, `eb11e11`, `c6f4779`, `e35075f`, `c59f45f`, `998a6f1`, `01abdfc`, `c81f6c8`, and `f4a8808`; the `useT()` change was recorded as an additional commit without its hash in the retired index. `useT()` replaced 26 subscribe-only `useLanguage()` calls; `useLanguage()` remains for components that read language or export state. A browser check found live SL→EN→SL text matched fresh loads on the welcome page and eight workspace routes, and the guided lesson changed language live. Prototype gating remains deferred to work that introduces prototypes; the branch prototypes were not present on master. See the [React architecture spec](../specs/react-architecture-refactor.md) for the accepted architecture and scope.

## Graph contracts

The graph-transient-state and Preset-collection decisions are retained in [ADR 0015](../adr/0015-graph-transient-state-declaration.md) and [ADR 0016](../adr/0016-preset-collections-owned-by-graph-families.md). For scene actions, a real-graph content-wide check applied every scene from 45 lessons and 6 chapter activities in synchronous sequences: all 51 authored cases passed against the unchanged limits, so no lesson content changed. Target-graph boundary probes caught a contract mismatch: weighted and uniform parameterization accept sample counts 1–40, while spline accepts 0–50. The old shared content check treated all as 0–50, so values 0 or 41–50 could pass translation and then fail on weighted/uniform graphs. The checks now defer range enforcement to each target graph. See [graph-contract deepening](../specs/graph-contract-deepening.md).

## Preview handoffs

The continuous-motion handoff's task tables and worker timing notes duplicated the Phase 1 evidence already reviewed in the handler's evaluation log. The retained [continuous-motion spec](../specs/continuous-motion-previews.md) records shipped clip decisions and limitations; representative capture and release provenance remains in [capture results](../tasks/representative-demonstration-previews/capture-results.md) and [release results](../tasks/representative-demonstration-previews/release-results.md). No worker timing table was needed to preserve current behavior or release evidence.

## Superseded visual refinement

The original visual-refinement attempt could not complete its production build because a dependency package was unavailable in that environment. Its browser smoke runner could not reach the local development server, so the catalog and page workflows were blocked. These are historical environment limits, not current failures or successful checks. Later catalog, library and graph-style work superseded that surface; current evidence is in the [graph-style implementation review](graph-visual-style/README.md).

## Bézier evaluation investigation

The investigation completed with a measured scratch-row optimization for curves with at least five control points. The matched OnePlus Nord N10 acceptance check remains unverified. Current measurements, mathematical comparisons and the remaining performance limit are in the [Bézier performance results](../bezier-performance-results.md) and [investigation spec](../specs/bezier-math-evaluation-performance.md).
