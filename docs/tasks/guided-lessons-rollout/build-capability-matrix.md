# Build the Guided lesson capability matrix

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Status:** ready; prerequisite for new lesson implementation

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
