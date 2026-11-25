# Task 07 slice 3b: scene reveal across a lesson step (handler 7, 2026-11-25)

Source: [task 07](../../../../tasks/ux-picks-app-wide/07-morph-and-view-director.md) slice 3 ("new content draws in, old fades"); morph `07-morph-design.md` (3a, accepted `5a4e2981`). Prototype behaviour (not code): `git show ux-picks:src/uxPicks/b1/sceneReveal.ts` (added elements drew in staggered by 90 ms; removed ones were cloned into a ghost layer fading 0.55 to 0 over 650 ms). Feel item: the owner judges it on the preview.

## Behaviour

- Only across a lesson step (the same `morphStep` wrapper as 3a), only on 2D JSXGraph boards (not surfaces), not under reduced motion.
- **Appear:** board objects visible after the step that were not visible before fade in from 0 to their own opacity over `GLIDE_MS` (250 ms, `easeOutCubic`, `motion.ts`), all together (no stagger: one motion per step, on the view glide's clock).
- **Disappear:** objects visible before and not after are shown as a ghost: a static clone of their rendered SVG nodes in an overlay layer above the board, `pointer-events: none`, `aria-hidden`, fading from 0.5 to 0 over 250 ms, then removed. The ghost does not follow the view glide (it fades fast enough); it is clipped to the board.
- Objects visible both before and after are untouched (3a moves their parameters).
- A learner press anywhere on the board or a control, Back/Next, Esc, unmount or graph change finishes it at once: appear opacities restored, ghosts removed.

## Shape

- `src/workspace/view/sceneReveal.ts`: framework-free; `capture(board)` returns the set of visible object ids and, for each, its SVG root node(s) (`rendNode`, and for texts the HTML node); `reveal(board, before, overlay, deps)` diffs after the step, runs the fade on injected `now`/`requestFrame`, returns `{finish(), dispose()}`. Opacity is applied on the rendered nodes' `style.opacity` (not JSXGraph attributes), so graph state, presets and the store never see it; `finish` clears the inline style.
- Wiring: the `morphStep` capability in `BaseGraph` captures before `apply`, reveals after it, and finishes any running reveal at the start of the next step and on dispose. The overlay is one absolutely positioned element owned by the board container, created lazily and removed on dispose.
- Budget: skip the reveal (step applies as today) when the diff has more than 400 objects or the capture takes longer than 8 ms (expensive boards such as the phase portrait's field).

## Acceptance

- Unit (jsdom, fake clock, fake board objects): appear fades 0 to 1 over 250 ms and ends with no inline opacity; ghosts are clones in the overlay, fade, and are removed by 250 ms; a press or a new step finishes both at once; dispose leaves no overlay node, frame or listener; reduced motion and surfaces do nothing; the budget skip works.
- Presets/exports and `captureState` are unchanged mid-reveal (opacity is style only).
- Browser (handler gate): pilot lessons at 1440x900, no page errors, no ghost left after 500 ms, no visible flash of the appearing objects at full opacity before the fade starts (sample the first painted frame), the probe's frame gaps not worse than 3a on the phase portrait.
