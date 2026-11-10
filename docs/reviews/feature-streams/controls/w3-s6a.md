# s6a evidence: graph-adjacent playback slot

Files: base/PlaybackSlotContext.ts, base/useGraphAdjacentPlayback.ts, base/PlaybackSlot.test.tsx (new); base/DemonstrationWorkspace.tsx + .css, base/controls/PlaybackButtons.tsx (edited); FixedPointGraph.tsx, DecasteljauAnimationControls.tsx (placement="graph").

Resize path reused: GraphSession.observeResize (ResizeObserver on #jgbox -> board.resizeContainer). Only CSS changes the height; BaseGraph untouched.

Observed failures (revert, run, restore):
- claim always succeeds -> "second claimant" fails; placement ignored -> "inspector placement" fails; listener not removed -> "route exit" fails.
- attribute not set -> "filled slot sizes the board" fails; media change ignored -> "crossing the breakpoint" fails.

Checks: just unit PlaybackSlot + controls + DemonstrationWorkspace + FixedPointGraph.host + bezier: passed; earlier full base+functions+curves/bezier run passed (before the useSyncExternalStore refactor of the claim flag; focused rerun after). just lint on touched files passed; just typecheck run last.
Logs: .command-logs/w3-s6a-*.log.

## Handler review (2026-11-10)

Engineering review (Sonnet) of `3aff64e3`: no blocking finding. Handler decisions: the status line moves with the group (a blocked reason must stay next to the button); the slot is inactive in Presentation mode; crossing the breakpoint (rotation) re-creates the buttons' DOM, so a focused button loses focus there: accepted for now and listed for the rollout slice (spec acceptance 3, "focus retained sensibly"). Fixed: in lesson-content mode the slot is dimmed like the locked inspector (`GuidedLessonLayout.css`). Browser checks of criterion 1 (390×844, 360×640, `100svh` with chrome, scrolled page) are pending.
