# Controls step 5a: shared guided-lesson fixes

Source: docs/tasks/feature-streams/learn-ui.md 57-64; recheck in s5a-recheck.md.

## Decisions

1. Next/Back keep focus. Reason: after activating Next the effect in GuidedLesson.tsx moved focus to the lesson section, so a second Enter did nothing. Now the effect refocuses the activated Next/Back button when it is still enabled (`navigationFocus` ref, set in the button handlers). When the button is disabled (Back at the first frame) or gone (completion), the old behaviour applies (lesson section or completion heading). Other triggers (open, scene actions, jumps) are unchanged. Announcement does not depend on focus: the frame change is announced by the `.guided-lesson-progress` role=status, aria-live=polite region, whose text changes with the frame; the focus move was never the announcer (it landed on an unlabelled section).
2. Card drag bounds are the visible window, not the board (`computeGeometry` in useDraggableOffset.ts). Reason: the card covered the board with no way to park it on the inspector or margins. `clampOffset` is unchanged, so the top-left grip always stays on screen even when the card is larger than the window; keyboard arrows use the same geometry; offsets persist across frames as before; a window resize re-clamps (resize listener re-observes, which re-clamps). Presentation mode uses the same hook. The compact tab uses the same hook, so it is also free of the board. No auto-docking.
3. Exit focus: no change. Exit stays on the demo page restoring the graph; focus lands on that page's lesson launcher "Spoznaj to demonstracijo", the nearest on-page equivalent of the invoker. The chapter link path is "Nazaj v poglavje", which already restores focus to the launching link.

## Tests (observed failing before the fix)

- GuidedLesson.test.tsx "repeated Next keeps focus on Next...": failed with `expect(element).toHaveFocus()` (focus was on the lesson section).
- useDraggableOffset.test.ts "the card may leave the board but stays inside the window": failed with `expected { x: 147, y: +0 } to deeply equal { x: 500, y: +0 }` (clamped to the board; run against a stub restoring board bounds).

## Not verified

No browser smoke run; the 5a recheck screenshots were not retaken. A scrolled page can leave the card off-screen until the next drag or resize, as viewport bounds are measured at interaction time.
