# 02 — Deliver the Bisection custom-formula workflow

Status: planned, 2026-11-18. Source: [custom formulas specification](../../specs/custom-function-entry.md), acceptance 1, Bisection portions of 3, and 4. Dependencies: [evaluator](01-formula-evaluator.md) and [user-action availability](../master-review-followups-2026-11/01-user-action-availability.md).

## Outcome and scope

A teacher enters cos(x) − x, applies it, chooses [0,1], steps the construction and saves/reopens/exports/imports the setup on the existing Bisection route. Own its model/collection/graph, the reusable formula field and bilingual feedback. The graph's committed function remains authoritative during draft editing.

## Work

1. Add an explicit built-in/custom persisted function case and revalidate imported source before mutation. Preserve built-in IDs and legacy Presets; compiled state and drafts remain transient.
2. Build the labelled Apply field using shared control conventions. Valid Apply commits once, preserves endpoints, stops playback and resets the run. Invalid Apply preserves the draft, committed scene and running iteration with a useful localized reason.
3. Integrate evaluator results with existing sign tests and constructions. Distinguish an evaluated zero, sign change and established continuity. Reject detected poles/breaks, draw gaps and qualify unknown-continuity cases; preserve the intentional built-in jump example.
4. Implement the full reset/switch/restore matrix in the source spec, including early lesson exit and final-scene completion. Use current action availability without blocking authored scene preparation.
5. Record actual lazy route and initial/unrelated-route bundle changes. Coordinate any clip capture after the controls are accepted and update described architecture/capabilities.

## Verification and completion

Assert the first midpoint 0.5, retained [0.5,1] and later root near 0.7390851332. Cover exact endpoint roots, same signs, invalid midpoint, 1/x on [-1,1], shifted 1/(x−0.3) on [0,1], and conditional continuity language.

Exercise valid/invalid Apply during playback, Enter/blur, built-in/custom switching, run/workspace Reset, Preset reopen, exported-file import into a clean browser, invalid import rollback and pre-lesson custom-state restoration. Verify board objects and controls, not only model text.

Run focused `just unit`, `just check-changed`, required localization typecheck/build, engineering/mathematical/UI review and `$smoke-tester` on the route and its guided flow. Check both languages, keyboard/touch, 310 px inspector and narrow/enlarged-text layouts, plus free-exploration Presentation mode. Close every assigned source acceptance item with observed evidence before starting 03.
