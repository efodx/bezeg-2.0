# 5. Restore unfiltered drawing comparisons

Status: implemented in `1653fbb` (harness artifacts; no app change). Disposition and gaps: [coverage record](coverage.md#task-5-disposition). Gates task 1's affected browser removals. Source: [specification](../../specs/test-consolidation.md), acceptance 6–9.

## Scope and entry points

Start at `STALE_VIEW_CACHED_CURVES` in `src/graphs/base/GraphTransientState.test.tsx`. The inspected list names accumulation checkpoint/rollback, arc-length default, area-between-curves default/batch, Darboux default, definite-integral default and fixed-point default. Re-read the actual list at implementation start; do not assume it is unchanged.

Relevant implementations are in `src/graphs/functions/`, shared replacement orchestration in `BaseGraph.tsx`, and the real-graph observation harness. Use the diagnosing-bugs skill for implementation. The comment suggests stale view-dependent drawing/cache behavior, but accumulation's cause is explicitly unisolated. Treat each as a reported symptom, not an established shared root cause.

## Implementation and acceptance

- Reproduce each excluded scenario at a stable revision with curve filtering removed. Determine whether the defect is app drawing/cache invalidation or a harness observation artifact. Preserve a failing focused regression before a repair; do not normalize away real geometry differences to pass.
- Make each rendering dependency explicit where evidence requires it: model changes, viewport/bounding box, board size and scene replacement. Distinguish pure mathematical derived values from viewport-sampled drawing; do not invalidate all math on every cosmetic update.
- Consolidate proven common invalidation/reconciliation behavior in the existing module only when multiple affected graphs share it. Keep unique fixes local. Do not preselect a new cache framework or renderer.
- Remove every corresponding exclusion after its unfiltered semantic drawing comparison passes. Keep meaningful tolerance for numerical sampling, independent exact/numeric checks and finite valid drawing observations. Fix or document harness limitations explicitly; an untested app path remains a gap.
- Verify repeated restore/reset/batch behavior and zoom/pan/resize at unchanged model values. No stale view geometry, duplicated resources or mathematical changes may result.
- Measure representative drag/slider interactions before selecting rendering optimization or broad cache invalidation; compare after the fix and account for regressions under the performance-plan guidance.

## Verification and handoff

Run affected mathematical and real-graph contract tests with filtering removed, typecheck, build and delegated production smoke on affected routes with view changes and restore/reset. Report reproductions, root causes, per-exclusion disposition, numerical/performance evidence and residual gaps. Do not retire affected browser checks in task 1 until this evidence is accepted. Split repairs into bounded worker assignments by confirmed root cause rather than assigning all six graphs speculatively.
