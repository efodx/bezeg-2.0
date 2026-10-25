# Visible curve editing modes

## Scope and decision

Replace the selected-curve editing dropdown in `BaseCurveGraph.getSelect()` with visible mode buttons. The owner selected visible choices on 2026-10-25. Preserve the cream/green workspace, existing mode labels, mathematical behavior, routes and Presets. The structured Edit tab already has mode buttons and is outside this refinement.

## Acceptance

- Show all three existing editing modes together, with exactly one visibly selected and exposed through `aria-pressed`.
- Use native buttons in an accessibly named group. Support keyboard activation, visible focus, wrapping translated labels and at least 44px hit targets.
- Read selection from graph scene state and invoke the existing editing feature's mode setter. Restored scenes, Reset and language changes must keep the control synchronized.
- Preserve point addition/deletion and movement behavior; switching modes alone must not change geometry.
- Verify focused unit coverage, TypeScript, production build and representative browser interactions in both languages at desktop and narrow widths. Review 200% text enlargement and keyboard focus.

## Verification record

- Implemented three full-width native mode buttons, a reserved checkmark slot, named group, pressed state, wrapped labels and 44px targets. Existing labels, scene state and editing feature remain authoritative.
- `just unit src/graphs/base/ControlsFollowGraph.test.tsx`: all 7 tests passed, including indirect curve selection and scene restoration. The updated regression failed against the original component (2 failures), then passed after restoring the implementation.
- `just typecheck` and `just build`: passed. Build retains Sass deprecation warnings.
- Focused handler browser validation (the smoke-tester skill's isolated-control lane): `just smoke-built tests/curve-editing-modes.smoke.spec.cjs --workers=1 --port 4194`, 2 passed on the production build. Rational/base and Bézier/decasteljau: keyboard activation/focus, real point addition, dragging and deletion, language switch preserving selection, 1440px/390px layouts, 200% root text size and Reset/reselection. No page errors observed. Reviewed rendered English desktop and Slovenian narrow button captures.
- The first expanded browser run used the wrong accessible name for Reset and timed out; correcting the test to `Reset preset` passed. No application repair was needed.
- Impeccable detector: advisory palette/radius findings compare workspace controls to shell-only DESIGN.md. New controls deliberately retain incumbent workspace roles, 3px control corners and focus color; no shell design-system change is intended.
- No route or stored-Preset changes. Physical device/projector and assistive-technology testing were not performed.
