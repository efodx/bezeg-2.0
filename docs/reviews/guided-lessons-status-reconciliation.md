# Guided lesson backlog status reconciliation

Current disposition, 2026-10-24: the [owner's release policy](../guardrails.md#release-policy--owner-decision-2026-10-24) resolves the availability/review discrepancy below. Available implemented lessons count as released; terminology and physical-device/projector/classroom sign-offs are removed as gates. The eight missing smoke rows and evidence consolidation remain concrete follow-ups. The 2026-10-20 record below is historical.

Date: 2026-10-20. Scope: reconcile older rollout task statuses against later repository evidence; no application changes, new implementation, or educational approval.

## Current disposition

| Record | State | Follow-up owner |
| --- | --- | --- |
| Capability matrix | Evidence consolidation and eight missing smoke rows remain | [Matrix task](../tasks/guided-lessons-rollout/build-capability-matrix.md), the single rollout follow-up owner |
| Pilot and polynomial rollout handoffs | Implemented and released under the current policy; redundant handoffs retired | Preserve concrete coverage limits in the matrix and [lesson history](lesson-implementation-history.md) |
| Cohorts B–E | Released; historical mathematical repairs and coverage limitations retained | [Content blueprint](../specs/guided-lessons-content-expansion.md) and [cohort evidence](lesson-implementation-history.md#rollout-cohorts-be) |

## Evidence inspected

- [Rollout matrix](../specs/guided-lessons-rollout.md#capability-matrix): all original 26 routes already identified as pilot/expansion/cohort drafts.
- [Content blueprint](../specs/guided-lessons-content-expansion.md#cohort-plan): Cohorts A–E recorded as implemented drafts. The Cohort B contract explicitly permits draft availability while owner language/classroom review remains pending.
- `src/learning/runtime/lessonCatalog.ts`: the explicit `GUIDED_LESSON_AVAILABLE_IDS` contains the original 26 routes plus later function/analysis lessons. Its companion test asserts the available IDs. App availability cannot certify owner review.
- `src/learning/content/guidedLessons.ts`, `additionalGuidedLessons.ts`, `expansionGuidedLessons.ts`, and the later cohort content modules: implementations exist for the routes in the superseded polynomial task.
- `tests/guided-lessons.smoke.spec.cjs`: route rows exist for the five polynomial-task routes implemented in Cohorts B/D/E, but not `affine` or `elevation`, nor the three pilots. Shared flows cover observation handoff and restoration for the rows that exist. Test existence is separate from execution evidence.
- Cohort B–E verification sections record historical type/unit/build/browser results. For example, Cohort E records 187/187 built smoke checks, including 153/153 lesson checks, plus an explicit Farin drag coverage omission and unresolved spline default-data questions. These counts are historical, not current suite totals.
- [Standalone pilot implementation evidence](standalone-learning/implementation.md) records later shared lesson/activity regression coverage while retaining owner and physical-device/classroom limits. This is corroborating runtime evidence, not approval of all earlier lesson prose.

## Resolved availability terminology

The original reviewed-only wording and later draft availability were reconciled by the owner's 2026-10-24 release policy. Available implemented lessons are released; general wording, device and classroom sign-offs no longer create an approval queue. The source and browser gaps below remain concrete follow-ups, and no unperformed check becomes a pass.

## Current smoke coverage gap

Catalog-to-row comparison finds 45 available lessons and 37 per-lesson smoke rows, after mapping the smoke aliases `param-weighted` and `param-uniform-ph` to their catalog IDs. The eight missing IDs are `bezier`, `decasteljau`, `affine`, `elevation`, `rational`, `rational-decasteljau`, `ph-cubic`, and `ph-quintic`. Other tests contain some targeted checks; they do not supply the table's full per-lesson forward/exit/re-entry/narrow-screen contract. Restoring these eight rows is a real verification follow-up, not evidence that the lessons need implementing again. Track it with the matrix and pilot review work. This documentation reconciliation does not add or execute tests.

## Verification of this documentation change

Cross-checked task/spec statuses, catalog membership, smoke row presence, and recorded verification sections. Checked changed-document links and Git whitespace. No app suite or browser smoke run is required for this documentation-only reconciliation; no new runtime, physical-device, or classroom verification is claimed.
