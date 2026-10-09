# Review and release the Guided lesson pilots

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Dependencies:** [Build the capability matrix](build-capability-matrix.md), [runtime task](../guided-lessons/implement-guided-lesson-runtime.md), [pilot content task](../guided-lessons/study-and-fill-pilot-content.md)

**Status:** ready after capability-matrix review

## Goal

Turn the `bezier`, `decasteljau`, and `ph-cubic` implementation drafts into reviewed lessons or record the specific follow-up that prevents release.

## Acceptance criteria

- The owner or subject-matter reviewer checks every formula, worked example, Slovenian phrase, English counterpart, prepared scene, and expected observation.
- Production-browser review covers direct entry, Back/Next, Continue lesson, Exit, completion, scene restore, language switching, animation cancellation, projection, narrow-screen, keyboard, and touch-sized controls.
- Mathematical and focused runtime suites pass, and the unrelated starter-test baseline is either fixed or separately documented as a release blocker.
- The reviewed-lesson allowlist changes only after all three lessons satisfy the gate.
