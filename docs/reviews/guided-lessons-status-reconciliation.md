# Guided lesson backlog status reconciliation

Date: 2026-10-20. Scope: reconcile older rollout task statuses against later repository evidence; no application changes, new implementation, or educational approval.

## Disposition

| Task | Reconciled state | Remaining work |
| --- | --- | --- |
| [Build capability matrix](../tasks/guided-lessons-rollout/build-capability-matrix.md) | Partially fulfilled by rollout matrix, blueprint, and cohort evidence | Consolidate evidence-linked rows, name owners, and record unresolved review gates. Confirm scope before extending the original 26-route inventory. |
| [Review/release pilots](../tasks/guided-lessons-rollout/review-and-release-pilot.md) | Implemented pilots are already available; review gate remains open | Owner/subject-matter language and content approval; classroom/device review; address the separately queued graph-obstruction issue. |
| [Extend polynomial cohort](../tasks/guided-lessons-rollout/extend-polynomial-bezier-cohort.md) | Implementation superseded by completed expansion slices | Review existing drafts; do not reimplement the seven lessons. |
| [Cohort B](../tasks/guided-lessons-rollout/implement-cohort-b.md), [C](../tasks/guided-lessons-rollout/implement-cohort-c.md), [D](../tasks/guided-lessons-rollout/implement-cohort-d.md), [E](../tasks/guided-lessons-rollout/implement-cohort-e.md) | Implemented drafts, as already recorded | Retain their recorded owner/classroom gates and specific coverage limits. No blanket completion upgrade. |

## Evidence inspected

- [Rollout matrix](../specs/guided-lessons-rollout.md#capability-matrix): all original 26 routes already identified as pilot/expansion/cohort drafts.
- [Content blueprint](../specs/guided-lessons-content-expansion.md#cohort-plan): Cohorts A–E recorded as implemented drafts. The Cohort B contract explicitly permits draft availability while owner language/classroom review remains pending.
- `src/learning/runtime/lessonCatalog.ts`: the explicit `GUIDED_LESSON_AVAILABLE_IDS` contains the original 26 routes plus later function/analysis lessons. Its companion test asserts the available IDs. App availability cannot certify owner review.
- `src/learning/content/guidedLessons.ts`, `additionalGuidedLessons.ts`, `expansionGuidedLessons.ts`, and the later cohort content modules: implementations exist for the routes in the superseded polynomial task.
- `tests/guided-lessons.smoke.spec.cjs`: route rows exist for the five polynomial-task routes implemented in Cohorts B/D/E, but not `affine` or `elevation`, nor the three pilots. Shared flows cover observation handoff and restoration for the rows that exist. Test existence is separate from execution evidence.
- Cohort B–E verification sections record historical type/unit/build/browser results. For example, Cohort E records 187/187 built smoke checks, including 153/153 lesson checks, plus an explicit Farin drag coverage omission and unresolved spline default-data questions. These counts are historical, not current suite totals.
- [Standalone pilot implementation evidence](standalone-learning/implementation.md) records later shared lesson/activity regression coverage while retaining owner and physical-device/classroom limits. This is corroborating runtime evidence, not approval of all earlier lesson prose.

## Unresolved contract discrepancy

The original rollout acceptance criteria and the runtime catalog comment describe an allowlist of reviewed lessons. Later cohort contracts and tasks record draft availability before owner/classroom approval. This reconciliation documents the implemented state and preserves the outstanding gate; it does not invent approval, remove available lessons, or decide a new release policy. Clarify the release/availability terminology when the owner addresses lesson review. Original acceptance criteria remain visible for that discussion.

## Current smoke coverage gap

Catalog-to-row comparison finds 45 available lessons and 37 per-lesson smoke rows, after mapping the smoke aliases `param-weighted` and `param-uniform-ph` to their catalog IDs. The eight missing IDs are `bezier`, `decasteljau`, `affine`, `elevation`, `rational`, `rational-decasteljau`, `ph-cubic`, and `ph-quintic`. Other tests contain some targeted checks; they do not supply the table's full per-lesson forward/exit/re-entry/narrow-screen contract. Restoring these eight rows is a real verification follow-up, not evidence that the lessons need implementing again. Track it with the matrix and pilot review work. This documentation reconciliation does not add or execute tests.

## Verification of this documentation change

Cross-checked task/spec statuses, catalog membership, smoke row presence, and recorded verification sections. Checked changed-document links and Git whitespace. No app suite or browser smoke run is required for this documentation-only reconciliation; no new runtime, physical-device, or classroom verification is claimed.
