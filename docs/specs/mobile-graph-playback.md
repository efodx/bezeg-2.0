# Playback controls within reach of the graph on phones

**Status:** proposed future fix; documentation only. Preparing this spec does not authorize application implementation.
**Reported:** 2026-10-20
**Related:** [workspace usability](tools-usability-redesign.md), [lesson graph access](lesson-graph-access.md), [guardrails](../guardrails.md).

## Problem and evidence

On the [fixed-point demonstration](https://efodx.github.io/bezeg-2.0/analysis/fixed-point), the owner reports that phone users must scroll down to start playback and then scroll back up to see the animation. They can miss the first iterations and must repeat the journey to pause or reset. The owner prefers controls accessible while viewing the graph over automatic scrolling.

Fixed-point is an illustrative example, not the scope boundary. This is a shared workspace usability problem: every demonstration with animation or iterative playback needs its relevant controls accessible while the graph is visible.

Source inspection supports the report: the shared workspace stacks the inspector below the graph at narrow widths, and `FixedPointGraph.renderControls()` puts Next step, Play/Pause, and Reset after example, initial-value, and tolerance settings. This is source evidence, not a reproduced phone/browser result; the deployed page could not be loaded through the research tool during preparation.

Other source-confirmed playback integrations include `BisectionGraph`, `SequenceGraph`, and the shared `DecasteljauAnimationControls` used by `DecasteljauGraph` and `DecasteljauGraph2`. This is a starting inventory, not an exhaustive route list; resolve all active routes and shared hosts when implementation begins.

## Recommended interaction

Add a shared, compact playback row immediately below the graph, outside the plotting surface, on narrow screens. Each demonstration supplies its supported actions: for iterative demonstrations, these may be Play/Pause, Next step, and Reset; De Casteljau currently provides Play, Pause, Stop, and Replay. Preserve their distinct meanings rather than forcing every demonstration into the fixed-point button set. Keep setup fields and detailed help in the existing inspector. Prefer moving the existing playback group into a shared graph-adjacent slot at the responsive breakpoint, retaining one accessible instance and the same graph-owned actions and state. Decide placement of live parameter/speed controls from each demonstration's workflow; keep controls needed to observe and adjust ongoing motion accessible with the graph, using a compact disclosure if necessary, rather than moving the entire inspector beside it.

The row and a useful graph view must fit together in the phone viewport. Account for the heading, navigation, browser chrome, safe areas, and text enlargement when sizing the board; appending buttons beneath an already full-height board would not solve the problem. Use a responsive layout rather than moving buttons over mathematical content. Keep the row in normal flow initially; add sticky positioning only if the prototype demonstrates a specific need without obscuring content or leaving unrelated playback controls floating while reading elsewhere.

| Alternative | Assessment |
| --- | --- |
| Graph-adjacent playback row | Recommended: users can start, pause, step, and reset while seeing the result; costs a small amount of vertical space. |
| Fixed toolbar over the graph or screen bottom | Reachable, but may obscure geometry, conflict with lesson controls, or remain detached from an offscreen graph. Avoid as the initial design. |
| Scroll to the graph when Play is pressed | Fallback only: causes a context jump and leaves Pause/Reset below the viewport. If ultimately selected, return to the graph before starting playback, respect reduced motion, and explicitly solve access to Pause. |

## Scope

Cover all active demonstrations with user-operated animation or iterative playback through a shared workspace placement contract. Inventory every affected route, its supported actions and live controls, and its graph/host integration before implementation. Fixed-point may be the first prototype, but completion requires rollout to every inventoried playback route, including polynomial and rational variants where exposed. Do not add playback to demonstrations that do not support it. Keep the task bounded to playback accessibility rather than redesigning the whole inspector.

Desktop and projection retain their current control placement unless a demonstrated layout conflict requires an explicit adjustment. Shared chapter/activity hosts and Guided lesson exploration using these demonstrations must expose the same applicable playback access. Coordinate with lesson minimization and in-progress chapter/activity changes; this task does not replace those designs.

Reuse existing animation ownership, timing, mathematical transitions, end conditions, and availability rules. Layout changes must not create a second controller, reset a scene, remount a board, or alter preset data. No route or stored-data breaking change is intended.

## Acceptance criteria

1. On every inventoried playback route at 390 × 844 and 360 × 640 CSS pixels, the user can view a useful animated construction and operate its supported playback actions without scrolling between graph and controls. Capture the actual board area and visible construction, not just button visibility. At 320px width, short landscape, and 200% text enlargement, keep actions reachable without clipping or document-level horizontal overflow; where simultaneous fit is impossible, document the fallback and avoid covering geometry.
2. Playback actions do not programmatically scroll the page. The first animation change is visible from the graph view. Pausing remains reachable during playback, and terminal/disabled states match each demonstration's existing behavior. Preserve route-specific Step, Reset, Stop, and Replay semantics and assess access to live parameter/speed controls explicitly.
3. Exactly one playback group is exposed to keyboard and assistive technology in each layout. Touch targets are at least 44 × 44 CSS pixels, labels are clear, focus is visible and retained sensibly when availability or layout changes, and controls work without hover. Keep Slovenian and English labels in lockstep.
4. Resizing, rotating, opening/collapsing the inspector, and changing its tab preserve the scene, running/paused state, and existing timing. They do not add timers or trigger playback. Route exit and graph disposal still stop playback.
5. Setup fields, detailed help, and other controls remain available. Graph panning, zooming, labels, points, and navigation remain usable. Playback agrees with the graph and inspector, including automatic stop, reset, and parameter changes.
6. Desktop, Presentation mode, applicable Guided lesson entry/exploration/exit, and chapter/activity hosts remain usable, without overlapping lesson or playback chrome. Every inventoried playback route uses the shared placement behavior; representative nonanimated demonstrations show no empty toolbar or layout regression.

## Verification for future implementation

Start with `just --list` and [the command guide](../commands.md). Reproduce the issue in a production build and capture before/after mobile views. Maintain a route/action coverage matrix for every inventoried playback integration. Exercise the complete supported playback sequence per route, including iterative start → pause → step → reset and continuous start → pause → stop → replay, plus live parameter/speed changes where supported. Use focused shared-placement/control tests plus the existing affected model/controller tests; avoid changes to numerical evaluation. Run TypeScript and production build, including the required localization checks if catalogs change.

Use `$smoke-tester` and [the browser checklist](../smoke-tests.md) for affected routes/workflows; a shared workspace behavior change requires the full checklist. If the skill is unavailable, report that and the actual browser coverage. Check touch emulation, keyboard, both languages, enlarged text, rotation, Presentation mode, lesson interaction, and route disposal. Seek a real-phone check and distinguish it from emulation. Record incomplete coverage. No application tests are needed for preparing these documents alone.

## Implementation task

[Keep demonstration playback beside the graph](../tasks/mobile-graph-playback/graph-adjacent-controls.md).
