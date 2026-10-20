# Review and release the Guided lesson pilots

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Dependencies:** [Build the capability matrix](build-capability-matrix.md), [runtime task](../guided-lessons/implement-guided-lesson-runtime.md), [pilot content task](../guided-lessons/study-and-fill-pilot-content.md)

**Status:** open review gate for already implemented and available pilot drafts (reconciled 2026-10-20); not an unstarted implementation task.

`bezier`, `decasteljau`, and `ph-cubic` are already in `GUIDED_LESSON_AVAILABLE_IDS`. Runtime/content tasks and later regression records provide implementation and some automated-browser evidence, but these three pilots have no per-lesson row in the current shared smoke table. Restore that coverage before claiming current route-level acceptance. Availability does not establish owner/subject-matter approval or physical-device/classroom acceptance; those gates remain open. The reported graph-obstructing prompt also has a separate [future usability task](../lesson-graph-access/restore-graph-access.md).

The allowlist criterion below is the original release target, not a description of current enforcement. Later [blueprint cohort contracts](../../specs/guided-lessons-content-expansion.md#cohort-b-implementation-contract) explicitly record draft availability with owner/classroom review pending. Keep that distinction visible rather than claiming all pilot release criteria passed. See the [reconciliation record](../../reviews/guided-lessons-status-reconciliation.md).

## Goal

Turn the `bezier`, `decasteljau`, and `ph-cubic` implementation drafts into reviewed lessons or record the specific follow-up that prevents release.

## Acceptance criteria

- The owner or subject-matter reviewer checks every formula, worked example, Slovenian phrase, English counterpart, prepared scene, and expected observation.
- Production-browser review covers direct entry, Back/Next, Continue lesson, Exit, completion, scene restore, language switching, animation cancellation, projection, narrow-screen, keyboard, and touch-sized controls.
- Mathematical and focused runtime suites pass, and the unrelated starter-test baseline is either fixed or separately documented as a release blocker.
- The reviewed-lesson allowlist changes only after all three lessons satisfy the gate.
