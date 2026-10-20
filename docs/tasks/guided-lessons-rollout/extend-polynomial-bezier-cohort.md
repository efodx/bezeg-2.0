# Extend Guided lessons to the polynomial Bézier cohort

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Dependencies:** [Build the capability matrix](build-capability-matrix.md), [Review and release the pilots](review-and-release-pilot.md)

**Status:** implementation superseded by later cohort work; content/classroom review remains open (reconciled 2026-10-20). Do not start a duplicate implementation.

All seven listed routes are already available in the runtime lesson catalog:

- `bernstein`: [Cohort B](implement-cohort-b.md).
- `subdivision`, `repeated-subdivision`, `extrapolation`: [Cohort D](implement-cohort-d.md).
- `decasteljau-alternative`: [Cohort E](implement-cohort-e.md).
- `affine`, `elevation`: the [rollout matrix](../../specs/guided-lessons-rollout.md#capability-matrix), [expansion blueprint](../../specs/guided-lessons-content-expansion.md), and pilot content module record the earlier expansion drafts.

The five Cohort B/D/E routes have shared smoke rows; `affine` and `elevation` do not. This closes the planned implementation slice, not its reviewed-lesson acceptance criteria. Track remaining language, subject-matter, and classroom/device gates through the cohort records and [pilot review task](review-and-release-pilot.md); consolidate ownership and missing smoke coverage in the [matrix follow-up](build-capability-matrix.md). See the [reconciliation record](../../reviews/guided-lessons-status-reconciliation.md) for evidence and limits.

## Goal

Study and implement reviewed lessons for `bernstein`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, and `elevation`, only where each graph exposes a coherent typed learning flow.

## Acceptance criteria

- Every route has either a reviewed lesson or an explicit no-fit decision.
- New actions are graph-owned, typed, validated, and covered by route-specific tests.
- Content is source-backed, localized in Slovenian and English, and matches the prepared graph scene.
- The cohort passes the same mathematical, restoration, accessibility, browser, projection, narrow-screen, keyboard, and touch review as the pilots.
