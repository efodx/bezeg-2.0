# Graph control visual polish

Status: scheduled 2026-11-11 (stream [controls-visual](../tasks/feature-streams/controls-visual.md)). Acceptance criteria below are a draft; the stream's handler finalises them from the audit (step 1) before any styling slice.

## Problem

The [shared graph controls](shared-graph-controls.md) made every graph's controls behave the same way: one label, keyboard, focus, refusal and Reset model in `src/inputs/` and `src/graphs/base/controls/`. They do not yet look like one family. The owner reported on 2026-11-11 that quite a few controls still look bad. Known examples: browser-default checkboxes 13 px high on the projective routes, a 40 px inspector field where the touch target is 44 px (`WorkspaceControls.css:54` outranks `NumberInput.css:26`), and button groups with hand-written radii.

[DESIGN.md](../../DESIGN.md) records the web shell and homepage palette, radii and components, but nothing for graph controls. The [roadmap](../roadmap.md#3-improve-tools-and-visual-design) asks for consistent spacing, typography, icons, contrast and curve styling that keep the elderflower identity, and [product direction](../product-direction.md#visual-design-proposal) asks for the look to be chosen through a small prototype, not from prose.

## Scope

In: the controls themselves (buttons, button groups, sliders and their number fields, number inputs, selects, switches and checkboxes, count setters, point and value lists, disclosures, playback buttons, Preset controls, refusal and hint text) and their layout in the workspace inspector, the control row and Presentation mode, on desktop and at 360 × 640.

Out: the graph drawing itself ([graph visual style](graph-visual-style.md), [rendered style contracts](rendered-graph-style-contracts.md)), the homepage and Learn shell, lesson panels, and behaviour of controls (already specified in [shared graph controls](shared-graph-controls.md)). No UI library is added; a dependency change stops the stream (feature-streams README).

## Approach

1. **Audit.** Screenshot the controls area of every Demonstration route at 1440 × 900, 360 × 640 (touch) and in Presentation mode, in Slovenian. Rank the problems: inconsistent sizes, spacing and alignment, browser-default widgets, weak contrast or focus, crowding or overflow at 360 px. Record evidence under `docs/reviews/feature-streams/controls-visual/`.
2. **Tokens and prototype.** Name control tokens (spacing, control height, radius, border, focus ring, typography) as CSS custom properties derived from the DESIGN.md palette. Restyle the shared components on one route (`/bezier/curve`), and compare before and after screenshots. Record the chosen look in a "Graph controls" section of DESIGN.md.
3. **Rollout by component.** One slice per component kind; most changes are shared CSS, so each slice reaches every route. Remove per-graph overrides that the shared style makes unnecessary.

## Acceptance criteria (draft)

1. Every shared control kind uses the named tokens; no per-graph CSS sets a control's height, radius, border or focus ring except a recorded exception.
2. Text and control boundaries meet WCAG 2.2 contrast (4.5:1 text, 3:1 boundaries and focus indicator); every focusable control shows a visible focus ring.
3. On coarse pointers every interactive target is at least 44 CSS px, including inspector fields and checkboxes.
4. No control's label, value or hint is clipped at 1440 × 900, 1024 × 768, 390 × 844 and 360 × 640 or at 200 % text (the `just controls-fixture` views), and no new horizontal scroll appears.
5. The graph stays prominent: at 1440 × 900 the board area is not smaller than before the change on any route.
6. Before and after screenshots of the audited routes are recorded, and a UI and accessibility review accepts each slice.
7. DESIGN.md gains a "Graph controls" section that names the tokens and components.

## Decisions

Recorded by the stream handler as they are made: choice, reason, rejected alternative.
