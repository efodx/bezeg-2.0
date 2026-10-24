# Build the Guided lesson capability matrix

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Status:** partially fulfilled; sole owner of consolidating existing evidence and adding the eight missing per-lesson smoke rows (reconciled 2026-10-24). This is not a fresh implementation prerequisite.

The [rollout matrix](../../specs/guided-lessons-rollout.md#capability-matrix), [content blueprint](../../specs/guided-lessons-content-expansion.md), and the consolidated Cohort B–E evidence already describe implemented actions, scenes, mathematical checks, and historical browser coverage. All original 26 lessons are present in the runtime catalog; current shared smoke rows cover Cohorts B–E but omit eight earlier lessons (see the reconciliation record). Do not repeat capability discovery or block already implemented cohorts on this task's old status.

Still open: consolidate retained specifications and evidence into evidence-linked rows with named owners and explicit content review status. Add shared per-lesson smoke rows for exactly `bezier`, `decasteljau`, `affine`, `elevation`, `rational`, `rational-decasteljau`, `ph-cubic`, and `ph-quintic`. The original 26-route scope is historical; the current runtime catalog contains later function and analysis lessons too. Inventory the current routes and identify which additional routes have evidence before claiming this matrix covers every active demonstration. See the [reconciliation record](../../reviews/guided-lessons-status-reconciliation.md) and [implementation history](../../reviews/lesson-implementation-history.md#rollout-cohorts-be).

## Goal

Inspect all 26 active Demonstrations and replace the initial capability-focus notes with evidence-backed rows describing supported typed actions, prepared scenes, ownership, correctness checks, localization/content status, and browser review status.

## Dependencies

- [Guided lesson rollout spec](../../specs/guided-lessons-rollout.md)
- [Current capabilities](../../capabilities.md)
- Existing graph implementations and mathematical checks

## Acceptance criteria

- Every active route has one row and one named owner for unresolved work.
- Actions are confirmed from the graph implementation; no action is inferred from labels or simulated controls.
- Each candidate scene identifies the graph state before and after the action, the expected visual result, and the relevant mathematical check.
- Routes with no coherent supported lesson are explicitly marked no-fit with a reason.
- The matrix links to the next content or implementation task without changing application code.
- The eight named lessons above each have a route-specific row in `tests/guided-lessons.smoke.spec.cjs` covering forward navigation, exit, re-entry, and narrow-screen behavior. Existing targeted tests do not substitute for these shared flows.
