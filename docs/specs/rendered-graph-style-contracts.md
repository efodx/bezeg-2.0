# Rendered graph style contracts

Status: proposed implementation specification, 2026-10-12. The owner confirmed the testing boundaries: the real JSXGraph SVG renderer and figures downloaded through the existing export controls. This specification does not authorize implementation.

## Problem Statement

Students and educators need editable points, derived points, constructions, and mathematical labels to remain distinguishable on the graph and in exported figures. Contributors need an early automated failure when an appearance change breaks that distinction.

During the illustrated C rollout, JSXGraph's general color alias overrode explicit point fill and outline attributes. Style-object assertions did not expose the actual rendered result. The error was caught during late browser/export review, after the treatment had spread across graph families. A real-renderer regression test now covers the ordinary control-point case, but derived roles and state changes still need comparable evidence.

## Solution

Extend the existing rendered-point test into a bounded set of appearance contracts, then verify representative state changes and downloaded SVG/PNG figures through the production browser. A failure identifies the affected role, state, and observed rendering. Contributors can run the focused checks before rolling an appearance change across Demonstrations; the same checks participate in existing CI.

The contracts verify current intended behavior. They preserve geometry, exact mathematical notation, controls, Guided lessons, Presets, and export ownership.

## User Stories

1. As a student, I want editable points to have the intended fill and outline, so that I can recognize what I can move.
2. As a student, I want derived points to retain their distinct treatment, so that I can distinguish construction results from inputs.
3. As an educator, I want spline joins to retain their intended appearance, so that I can explain continuity.
4. As a student, I want a hovered point to remain visibly highlighted, so that I know which point will respond.
5. As a student, I want rational weight selection to highlight the active point, so that I can associate a weight change with its input.
6. As an educator, I want construction levels and the current result to remain distinguishable, so that I can explain the recursion.
7. As a student, I want labels to retain exact mathematical notation, so that presentation changes do not change meaning.
8. As an educator, I want exported SVG figures to retain the graph's point and label hierarchy, so that teaching material remains readable.
9. As an educator, I want exported PNG figures to retain the intended background and visible content, so that shared figures match the Demonstration.
10. As a student, I want size and visibility controls to keep governing the rendered graph, so that the appearance remains adjustable.
11. As a contributor, I want actual renderer output checked before a broad rollout, so that renderer attribute precedence cannot hide a defect.
12. As a contributor, I want meaningful failures for each role and state, so that I can locate a regression quickly.
13. As a reviewer, I want export evidence from the same prepared scene, so that screen and file comparisons are valid.
14. As a contributor, I want isolated tests to dispose their boards and browser data, so that later checks remain reliable.
15. As a reviewer, I want rendering assertions that survive harmless markup changes, so that maintenance focuses on user-visible behavior.
16. As a contributor, I want CI to run these contracts through existing verification commands, so that future regressions block publication.

## Implementation Decisions

- Extend the existing JSXGraph SVG test fixture; introduce no new application interface or renderer abstraction.
- Exercise shared editable, fixed/derived, construction, result, and spline-join roles on a real board. Verify the attributes on the resulting marker elements rather than only the input style object.
- Treat hover and rational weight selection as state transitions. Test them through the real pointer/control behavior in the production browser where the shared unit fixture cannot exercise graph integration faithfully.
- Include a PH auxiliary-board representative to cover graph-specific marker overrides and its independent axes/labels behavior. Reuse the existing mathematical and ownership checks rather than duplicating them.
- Use small deterministic scenes with known coordinates, bounds, notation, and settings. Compare those inputs before and after appearance transitions and capture; appearance checks must not mutate derived geometry to create a fixture.
- Use the existing figure-export boundary and Save controls. Preserve export-time MathJax typesetting, transparent SVG, the intended PNG background, readiness, cancellation, and board ownership.
- Prefer computed SVG attributes and semantic label checks to whole-DOM snapshots. Use a bounded region comparison for raster figure content if needed; document tolerances and avoid brittle exact whole-image hashes.
- Wire additions into the current unit and production browser suites. Keep the installed dependencies and build tool; add no generic screenshot framework or renderer migration.

## Testing Decisions

Good tests observe rendered behavior or downloaded files. They fail for a visible contract violation while allowing harmless implementation changes. Expectations come from the role's intended contract, not from reading back the same style object used to create it.

Prior art includes the real JSXGraph control-point regression test, rational selection tests, figure-capture tests, SVG math-label tests, and production browser tests. Reuse their seams and lifecycle cleanup.

Acceptance criteria:

1. A table-driven real-renderer check covers each listed marker role with explicit expected fill, outline, and positive outline width. It observes actual rendered elements after board update.
2. A temporary mutation reintroducing the conflicting color alias causes the relevant contract to fail; restore the mutation before completion and record the failing/passing result.
3. Pointer hover and rational selection visibly change the intended marker's outline; leaving hover or changing selection restores the appropriate normal state. Point coordinates and board bounds remain unchanged.
4. Representative construction/result and PH auxiliary markers retain their intended roles. Main-board visibility controls do not acquire ownership of the auxiliary board.
5. A real SVG download contains the intended marker fills/outlines and typeset mathematical labels. Rendering it confirms the background remains transparent and labels remain positioned with their scene. Do not reject the renderer's existing empty hidden foreignObject as missing-label evidence.
6. A real PNG download decodes successfully and retains the intended background, visible curve/construction, markers, and mathematical labels. Compare the same settled scene, with fonts and MathJax ready.
7. Size and point-label/point visibility controls still change the visible output and restore correctly without changing geometry. Existing lesson restoration and export ownership checks remain passing.
8. Fixtures release boards, listeners, temporary containers, browser contexts, and test-owned data, including on assertion failure.
9. TypeScript, the affected unit suites, the production build, and the relevant production browser/export checks pass. Use the smoke workflow when required for the implemented scope; report skipped or blocked coverage explicitly.

## Out of Scope

Changing the illustrated C palette, graph defaults or evaluation, label-placement algorithms, lesson copy, Preset schemas, export architecture, renderer, dependencies, CI deployment design, full visual coverage of every route, and physical-device/projector acceptance. This is a regression-contract improvement rather than a graph redesign.

## Further Notes

Source context: [illustrated C specification](graph-visual-style.md), [implementation evidence](../reviews/graph-visual-style/README.md), [SVG math-label specification](svg-export-math-labels.md), and [ADR 0008](../adr/0008-export-time-mathjax-svg-typesetting.md). The existing unit starting point is the rendered marker regression in `src/graphs/styles/PointStyles.test.ts`; export behavior is already owned by the figure-capture modules. These pointers locate prior art, not a required future file layout.

This is independently implementable from the publication gate. Create implementation task documents only when the owner requests that breakdown.
