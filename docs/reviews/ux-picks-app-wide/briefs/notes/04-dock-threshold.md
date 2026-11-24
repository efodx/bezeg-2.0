# Dock threshold (feel fix)

Cause: `dropTarget` (src/workspace/layout/boardLayout.ts) measured only the pointer (grabbed on the card head) against an edge band of 0.28 x short side, then the nearest corner point, so a tall card's top had to be near the board bottom.

Fix: `dropTarget` takes the card's visible rect; its centre in the outer quarter per axis picks the nearest anchor in board-relative units (symmetric). BoardCards.tsx passes `visibleRect(...)` at drag move and drop.

Pointer y (from board top) at which br appears, Odcitki, grabbed at head y=29.
After (measured, 04-dock-probe.cjs): phase 1440x900 (board 1330x578) 234; phase 1024x768 (974x445) 199; Taylor 1440x900 (1330x569) 254; Taylor 1024x768 (974x423) 189. Drop docks (right gap 8, bottom gap 55).
Before (computed from the old rule, not measured): about 434, 334, 427, 317.
