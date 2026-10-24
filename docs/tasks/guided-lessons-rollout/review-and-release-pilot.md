# Review and release the Guided lesson pilots

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Dependencies:** [Build the capability matrix](build-capability-matrix.md), [runtime task](../guided-lessons/implement-guided-lesson-runtime.md), [pilot content task](../guided-lessons/study-and-fill-pilot-content.md)

**Status:** pilots released under the [owner's 2026-10-24 release policy](../../guardrails.md#release-policy--owner-decision-2026-10-24). The owner language and physical-device/projector/classroom gates are removed. Missing pilot smoke rows remain a concrete verification follow-up; this task is not fully verified. The original release brief below is historical where it requires those removed sign-offs. The linked graph-access repair is complete; the later [UX audit](../../reviews/guided-lessons-ux-audit-2026-10-24.md) owns the current findings.

`bezier`, `decasteljau`, and `ph-cubic` are released and already in `GUIDED_LESSON_AVAILABLE_IDS`. Their three missing per-lesson smoke rows remain a specific verification gap. The [graph-access repair](../lesson-graph-access/restore-graph-access.md) is complete; current UX defects are recorded in the later audit.

The availability list identifies supported released lessons. The [reconciliation record](../../reviews/guided-lessons-status-reconciliation.md) preserves the earlier contract discrepancy and its resolution.

## Goal

Close concrete pilot verification gaps and track defects in the already released lessons.

## Acceptance criteria

- Verify formulas, worked examples, prepared scenes and expected observations through appropriate mathematical/content checks. Separate owner language approval is not required.
- Production-browser review covers direct entry, Back/Next, Continue lesson, Exit, completion, scene restore, language switching, animation cancellation, projection, narrow-screen, keyboard, and touch-sized controls.
- Mathematical and focused runtime suites pass, and the unrelated starter-test baseline is either fixed or separately documented as a release blocker.
- Keep supported lesson availability accurate and name concrete unsupported or missing requirements.
