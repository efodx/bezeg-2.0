# Bezeg demonstration workspace usability redesign

Status: implemented on all active demonstration routes. The owner accepted the general polynomial Bézier and cubic PH pilots on 2026-10-08 and authorized rollout to every active route. The shared workspace follows [the redesign proposal](../reviews/interface-implementation-history.md#workspace-selections-and-tool-controls); implementation evidence and remaining classroom/device review are in [the implementation report](../reviews/tools-workspace-redesign.md).

## Problem Statement

Students and educators must look across separate side panels to connect graph settings, editing modes, construction parameters, and curve operations. Selecting a curve replaces the graph command area with a different control set, while specialized demonstrations add their own parameters and editors. On narrow screens, the general tools take up a long section above the graph. Presentation mode hides panels until hover, and the current “Povečava” label can be mistaken for viewport zoom even though it changes visual element sizes.

These patterns make it harder to find the next action, understand what a parameter changes, and keep the graph visible while using controls. Preset controls also use compact icons and do not make browser-local storage or import replacement effects clear.

## Solution

Create one graph-centered demonstration workspace with a stable contextual inspector. Keep topic navigation separate from controls. Organize the inspector into **Uredi**, **Prikaz**, and **Shrani** sections; show the current selection and editing mode; and label parameter values, ranges, and effects beside each control.

Use the recommended unified-inspector concept as the base, with optional one-sentence learning prompts for unfamiliar controls and an explicit, persistent entry to presentation controls. For narrow screens, keep the graph first and place the inspector in a tabbed bottom sheet.

Validate this workspace pattern on the general polynomial Bézier demonstration and the cubic PH demonstration before expanding it to all active demonstrations. Preserve their mathematical behavior and the static, client-only architecture.

## User Stories

1. As a student, I want to see the demonstration name and topic clearly, so that I know which curve concept I am exploring.
2. As a student, I want graph controls grouped by purpose, so that I can find editing, display, and save actions without searching both side panels.
3. As a student, I want the current selection and editing mode to stay visible, so that I understand what a graph click or drag will do.
4. As a student, I want clear modes for selecting, moving, adding, and deleting points, so that I can choose an operation intentionally.
5. As a student, I want each slider to show its parameter name, current value, valid range, and a short explanation, so that I can connect the control to the graph.
6. As a student, I want visual-size controls distinguished from viewport zoom, so that changing label size does not surprise me by appearing to change graph scale.
7. As a student, I want to show or hide control points, control polygons, offsets, and other available constructions from a predictable place, so that I can focus on the parts relevant to a lesson.
8. As a student, I want unavailable curve operations to explain what is needed, so that I know how to make them available.
9. As an educator, I want to save and reopen a named preset with a clear indication that it is stored in this browser, so that I can prepare examples without an account.
10. As an educator, I want import to explain which local preset collections will be replaced before it writes data, so that I can protect classroom examples.
11. As an educator, I want invalid preset files to show an actionable error without partially changing saved data, so that I can correct or recover from the problem.
12. As a teacher, I want presentation controls reachable without hover, so that I can operate the graph with a keyboard, touch screen, or classroom pointer.
13. As a teacher, I want curve distinctions to use labels and line or point styles as well as color, so that projected constructions remain understandable to more viewers.
14. As a mobile user, I want the graph visible before I open the full control sheet, so that I can explore without scrolling past a long tool list.
15. As a mobile user, I want editing, display, and save controls separated into compact tabs, so that I can reach the needed action with touch.
16. As a keyboard user, I want visible focus and keyboard-operable controls, so that I can navigate the workspace without a pointer.

## Acceptance Criteria

1. On the selected polynomial Bézier and cubic PH demonstrations, the graph remains the primary workspace at desktop widths. Topic navigation, graph, and contextual inspector have clear visual boundaries.
2. The same inspector sections remain available before and after selecting a curve. Selection changes the relevant controls inside the inspector instead of replacing the entire control area with a different layout.
3. The active editing mode is visibly selected. Changing mode updates the graph interaction as it does today, and the active mode has a short Slovenian hint.
4. Parameter controls show a localized label, current value, supported range or units, and concise help where the effect is not self-evident. Existing values and mathematical domains are preserved.
5. The visual-size slider is labeled to describe element sizing and is distinguishable from viewport zoom. Pan and zoom have visible controls and retain usable pointer, touch, and keyboard paths.
6. Demonstration-specific options remain available in the same inspector model, including PH offset and control-polygon geometry options. Controls do not silently disappear when selection or mode changes; their availability is clear.
7. At a narrow viewport (390 CSS pixels), the graph appears before the expanded controls. The control sheet can be opened, collapsed, and switched among editing, display, and save sections without hover.
8. Presentation mode keeps a persistent, keyboard- and touch-accessible way to open controls and exit presentation mode. Essential actions are not revealed only by hover.
9. Preset save, reset, import, export, and figure export have distinct text labels or accessible names. The interface explains that presets are local to the current browser.
10. Import checks the supported existing preset structure and numeric data before writing. Invalid input leaves local storage unchanged and presents an actionable error. Before replacing matching collections, the UI identifies the affected demonstrations and asks the user to proceed.
11. The existing preset collection keys and file structure are retained in this scope; no route, class identifier, or preset migration is introduced.
12. Slovenian remains the default interface language. Controls remain understandable without relying on color alone.
13. The Bézier and PH curves, parameters, selection behavior, construction results, and existing operations retain their current mathematical meaning.
14. All 26 active demonstration routes use the shared workspace. The home page, route paths, menu labels, preset keys, class identifiers, and file formats remain unchanged.
15. Every route keeps its demonstration-specific controls and existing operations available in the inspector; no command disappears with the legacy panels.
16. The graph-first narrow layout and explicit presentation controls work on every demonstration route. Existing constrained and derived-point behavior remains intact.

## Implementation Decisions

- **Initial rollout:** the shared workspace was first implemented on the general polynomial Bézier and cubic PH demonstrations, with other routes held until owner review. The owner accepted those pilots and authorized continuation across all 26 active demonstrations on 2026-10-08.
- **Accepted continuation:** the owner accepted the two pilots and authorized the workspace shell for all 26 active demonstration routes. Keep the home page and every route path unchanged. Use the route's existing Slovenian title and a concise shared description unless a graph already provides a more specific one.
- **Control compatibility:** preserve each route's existing graph and selected-curve controls inside the inspector. Keep structured point editing on the accepted general Bézier and PH editor patterns; do not add coordinate editing for constrained or derived spline points only to make pages look alike.
- **Primary seam:** the shared demonstration workspace that composes the graph with its general tools and contextual commands. Keep demonstration-specific control builders as contextual inputs to this workspace; avoid separate layout implementations for each mathematics family.
- **Navigation:** keep current demonstration routes and route meanings. Improve current-topic context and navigation hierarchy without renaming routes in this scope.
- **Inspector:** use stable **Uredi**, **Prikaz**, and **Shrani** sections. Keep selection-dependent operations in the editing section and present a reason when a required selection is absent.
- **Editing modes:** expose modes as explicit controls with persistent active state and short guidance. Preserve existing graph gestures where practical, adding visible alternatives for navigation.
- **Responsive behavior:** use a graph-first layout with a tabbed, collapsible control sheet on narrow screens. Presentation mode must not depend on hover.
- **Presets:** retain browser-local storage, collection keys, and the supported file shape. Add preflight validation and clear replacement consent; do not introduce accounts, a backend, or a migration format.
- **Visual language:** retain the elderflower identity, Slovenian labels, and graph prominence. Use readable spacing and typography, and distinguish constructions with labels, markers, and line styles as well as color.
- **No math or renderer migration:** keep existing curve implementations and JSXGraph integration. UI changes must not replace exact teaching constructions with approximations.

## Testing Decisions

- A good test observes user-visible behavior at the demonstration route: mode selection changes the visible mode and graph interaction; parameter values reach the existing operation; responsive controls remain available; and preset import either succeeds or leaves saved state unchanged with a useful error. Tests should assert visible outcomes and data effects rather than component internals or CSS class names.
- Test the shared demonstration workspace through the polynomial Bézier and cubic PH routes, including selection and no-selection states. Check the optional PH controls and a construction parameter in the ordinary Bézier view. For the all-route continuation, verify each active route renders the shell and review representative route-specific controls for Bernstein, rational curves, splines, quintic PH, and parameterization.
- Test preset import with a valid existing-format file, malformed JSON, unsupported structures, invalid numeric values, and a file with matching collection keys. Confirm the replacement list and verify no writes occur when validation fails or the user declines replacement.
- Review at normal desktop, classroom projection, and 390-pixel widths. Check keyboard focus and operation, touch targets and graph gestures, presentation controls without hover, and legibility without color alone.
- Mathematical algorithms are out of scope. If implementation changes an operation’s inputs or evaluation behavior, add the relevant mathematical checks before merging. Existing Bézier evaluation tests provide mathematical prior art, but they do not cover workspace interaction.
- The existing starter application test is not reliable prior art for this UI: it assumes a removed “learn react” link and lacks the router/context setup used by the application. Add or repair only the focused interaction coverage needed for this spec; do not treat a full-suite run as evidence for mathematical correctness.

## Out of Scope

- New curve constructions or changes to Bézier, rational, spline, or PH algorithms.
- Replacing JSXGraph, Bootstrap, React, the build tool, or the routing system.
- Changing routes, preset identifiers, or the preset file format; importing legacy formats through a migration.
- English localization, accounts, cloud sync, a backend, or a server database.
- A full guided curriculum, lesson authoring system, or assessment platform. Bounded per-demonstration Guided lessons are now defined separately in [the guided lessons spec](guided-lessons.md); this visual redesign spec does not define their content or runtime.
- Numeric performance optimization or rendering benchmark changes.
- A formal usability study; the visual concepts still need classroom and user review.

## Further Notes

The visual concepts are static and have not been usability-tested. The shared demonstration workspace was validated first on the general polynomial Bézier and cubic PH routes, then extended across all active routes after owner acceptance. Continue classroom, physical-device, and accessibility review separately from this implementation record.

## Visual identity follow-up

On 2026-10-09, the owner accepted the visual direction represented by **A · Krivuljni laboratorij**, the dark **B · Črnilo za projekcijo** presentation treatment, and **C · Kompaktni pogled** for narrow screens. The earlier guided/question-led variant was rejected because it made the question block the first visual element and did not compose well with the graph workspace. Production styling keeps the existing React workspace, routes, graph renderer, controls, prompts, and preset behavior; it changes the shared canvas, topic rail, inspector surfaces, typography, header treatment, presentation contrast, and responsive spacing only.

The follow-up route prototype on 2026-10-09 confirmed **A · Stranski pregled** as the production workspace composition: topic navigation at left, graph in the center, and a contextual inspector at right. The static “ready” status and decorative inspector mark were removed after review because they did not communicate actionable state. The throwaway comparison was exercised on `/bezeg/rational/farin-points` and `/bezeg/bezier/affine`; its reference mockups remain in [`docs/reviews/interface-implementation-history.md#workspace-selections-and-tool-controls`](../reviews/interface-implementation-history.md#workspace-selections-and-tool-controls).

This file is the reviewable local spec. If implementation is approved, create local task documents only for executable slices that will be carried out; decisions and reference-only findings belong here or in a planning document, not in task files.
