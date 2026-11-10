# s6a evidence: graph-adjacent playback slot

Files: base/PlaybackSlotContext.ts, base/useGraphAdjacentPlayback.ts, base/PlaybackSlot.test.tsx (new); base/DemonstrationWorkspace.tsx + .css, base/controls/PlaybackButtons.tsx (edited); FixedPointGraph.tsx, DecasteljauAnimationControls.tsx (placement="graph").

Resize path reused: GraphSession.observeResize (ResizeObserver on #jgbox -> board.resizeContainer). Only CSS changes the height; BaseGraph untouched.

Observed failures (revert, run, restore):
- claim always succeeds -> "second claimant" fails; placement ignored -> "inspector placement" fails; listener not removed -> "route exit" fails.
- attribute not set -> "filled slot sizes the board" fails; media change ignored -> "crossing the breakpoint" fails.

Checks: just unit PlaybackSlot + controls + DemonstrationWorkspace + FixedPointGraph.host + bezier: passed; earlier full base+functions+curves/bezier run passed (before the useSyncExternalStore refactor of the claim flag; focused rerun after). just lint on touched files passed; just typecheck run last.
Logs: .command-logs/w3-s6a-*.log.
