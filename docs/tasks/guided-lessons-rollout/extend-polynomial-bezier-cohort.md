# Extend Guided lessons to the polynomial Bézier cohort

**Source spec:** [Guided lesson rollout](../../specs/guided-lessons-rollout.md)

**Dependencies:** [Build the capability matrix](build-capability-matrix.md), [Review and release the pilots](review-and-release-pilot.md)

**Status:** planned; do not start before dependencies pass

## Goal

Study and implement reviewed lessons for `bernstein`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, and `elevation`, only where each graph exposes a coherent typed learning flow.

## Acceptance criteria

- Every route has either a reviewed lesson or an explicit no-fit decision.
- New actions are graph-owned, typed, validated, and covered by route-specific tests.
- Content is source-backed, localized in Slovenian and English, and matches the prepared graph scene.
- The cohort passes the same mathematical, restoration, accessibility, browser, projection, narrow-screen, keyboard, and touch review as the pilots.
