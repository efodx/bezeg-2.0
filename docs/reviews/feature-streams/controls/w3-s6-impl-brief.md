# Step 6 item 3, core slice brief: graph-adjacent playback slot

Read `w3-common-brief.md` first (role, checks, return rules). Slice id: `s6a`. Source: [graph-adjacent controls](../../../tasks/mobile-graph-playback/graph-adjacent-controls.md) item 3; spec `docs/specs/mobile-graph-playback.md` lines 17–60 (recommended interaction, the layout decision of 2026-11-09, acceptance criteria). Evidence to build on: `graph-adjacent-controls.inventory.md` (shared hosts, lines 5–13), `graph-adjacent-controls.prototype.md`, `graph-adjacent-controls.screenshots.md`.

## Settled design (handler)

- **Slot contract.** `DemonstrationWorkspace` renders an empty slot element directly after the board inside `section.workspace-graph` (normal flow, `data-playback-slot`) and provides it through a React context (`PlaybackSlotContext`, in `src/graphs/base/`). A media hook (`useGraphAdjacentPlayback`, `matchMedia('(max-width: 700px), (max-height: 500px)')`, subscribed and disposed properly) says whether the slot is active.
- **One instance.** `PlaybackButtons` takes `placement?: "graph" | "inspector"` (default `"inspector"`). With `"graph"` and an active slot, it renders its group through `createPortal` into the slot; otherwise inline as today. The React tree, state, handlers and the one status line stay the same; no second controller, no remount of the board, no timers added, no programmatic scroll. Exactly one group per graph may claim the slot; a second claim in development logs a console warning and renders inline.
- **Sizing (variant A).** While the slot is active and filled, the board height is `max(200px, 100svh - <board top> - <slot height>)`, computed by CSS custom properties that the workspace sets from `ResizeObserver` on the slot and the header (not a one-time measurement), and the board resizes through the existing board resize path (find how `DemonstrationWorkspace`/`BaseGraph` resize JSXGraph on viewport change; reuse it, do not add a second one). Nonanimated routes (empty slot) keep today's layout: the slot takes no space and the custom property is unset.
- **Desktop and Presentation mode** unchanged.

## Owned paths

`src/graphs/base/DemonstrationWorkspace.tsx` and its CSS, `src/graphs/base/controls/PlaybackButtons.tsx` (+ test), new files in `src/graphs/base/` for the context and hook, and their tests. Pilot integration only: `FixedPointGraph.tsx` and `DecasteljauAnimationControls.tsx` pass `placement="graph"`. Other routes are the next slice. Do not edit `BaseGraph.tsx` unless the resize path requires it; if so, report first in your result file before editing and keep the change minimal.

## Acceptance (this slice)

1. On `/analysis/fixed-point` and `/bezier/decasteljau` at 390×844 and 360×640, the playback group sits directly under the board and board plus every playback button are visible together at scroll 0 or after scrolling to the board top (unit-level: the portal target and the media hook; browser: handler smoke).
2. At 1280×800 nothing moves: the group is in the inspector as before (test with the media hook false).
3. Exactly one playback group in the DOM at any width; resizing across the breakpoint moves the group without remounting the graph or changing playing/paused state (test: start playing, flip the media query, still playing, same controller).
4. Route exit disposes the media listener and observers (test the cleanup).

## Checks

`just unit` for `src/graphs/base` and the two pilot graphs' directories, `just typecheck`, `just lint` on touched files. For each new assertion an observed failure (revert, run, restore) recorded in `w3-s6a.md` as you go.

## Return

≤300 words: done/not done per criterion with `file:line`, the resize path you reused, checks and observed failures, risks for the rollout slice (routes with several groups: Voronoi; own-built buttons). Bulky output to `w3-s6a.md`. On `HANDOFF`, write done/remaining there and stop.
