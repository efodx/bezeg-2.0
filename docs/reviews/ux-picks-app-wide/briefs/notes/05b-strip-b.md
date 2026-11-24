Slice B done (presenter, grip, strings); unit src/workspace, tsc, lint pass. Logs: 05b-strip-b.log (unit), 05b-strip-b-breaks.log (deliberate breaks), 05b-strip-b-smoke.log (browser).

Files: src/workspace/pucks/StripGrip.tsx (new: grip, ring, pointer + keyboard), PuckStrip.tsx (column/lift/grip props), pucks.css, src/workspace/presenter/BoardCards.tsx (stripDrag state, layoutAt(dock), preview with frozen folds, ghost, guards), localization/fragments/workspace-pucks.ts (strip_* keys), presenter/BoardCardsStrip.test.tsx (20 tests).

Open:
- Slice A layout: phase portrait at 1280x720, dock bottom-right: the row strip wraps in the narrow right column to 394x420 and lies at y=-17 (off the board top) and overlaps readouts and tools. 2j needs a fallback (cap the wrapped height, fold cards, or refuse the dock).
- The grip is not reserved by the layout: it straddles the strip's leading edge by 8 px.
- No UI calls resetAll yet ("Reset layout" has no button in the app); resetAll already clears `strip`.
- The shell-style card drag helper was not extracted: StripGrip mirrors CardShell's mechanics but reports docks.

Round 2 (2026-11-24): 2j widened (strip not capped at column width; fallback to bottom-left when y < gap) and grip reserved as first slot (presenter measures .puck-strip-grip + .puck-slot; CSS straddle removed; estimateStrip +24). Layout tests 106, src/workspace 306 pass, tsc/lint pass; breaks and browser logs: .command-logs/h6-b2-*.log. BoardCardsStrip tests adapted (bottom-right drag dy 80; Esc test uses ArrowLeft) because the wide strip fills the 600x400 jsdom board.

## Fix round (review + visual)
- Grip 24 px short side (pucks.css grip rules); StripGrip: arrow at ring end silent, cancel and lostpointercapture clear the pickup; layout PUCK_COLUMN_WIDTH 160 (side docks), rows stretch.
- Tests added in BoardCardsStrip.test.tsx (lostpointercapture, card-drag blocks grip, ring end, grip CSS size); the card-drag test passed on the old code too (the guards already existed). Written after the fixes, not strictly failing-first.
- Term: pucks = "krmilniki", recorded in docs/localization.md.
- Not in scope: strip covers board-drawn JSXGraph texts; truncated puck labels (pre-existing).
- Browser: smoke.cjs all rows, no failures, ERRORS []; cap.cjs rewritten (log .command-logs/05b-fix-cap.log). Measured column grip height 34 (a global button min-height), row grip 24x40.
