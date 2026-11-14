# Fix H2 (graphs typography follow-ups)

## A. Correlation line label (`src/graphs/functions/CorrelationGraph.tsx`)
Cause (pre-change site at 390: label Arial 15 px, 162 px wide; caption 11 px): the label size ignored the caption's narrow-board shrink (`fontSize` 0.9 x setting, floor 10), and `labelIsClear` checked only the view edges and points, never the axis tick strips, the caption corner or the lines. Placement used the measured `text.size`, not an estimate, so the Literata face was not the cause: the overlap exists without it.
Change: label font = min(caption font, max(10, 0.9 x setting)) (`lineLabelFontSize`, the 11 px / 700 px rule duplicated from `BaseFunctionGraph.caption`, which is not owned); `lineLabelPlacement` also rejects positions over tick strips and the caption corner (`view.avoid`) and over either line; on boards narrower than `COMPACT_BOARD_WIDTH` a label with no clear position is hidden (`hidden`), elsewhere it keeps the first position as before.
At 390 with only the y-on-x line both labels are hidden (legend names them); with both lines they show clear of lines, ticks, points and caption.

## B. Surface board text (`src/graphs/patches/surface-view/jsxSurfaceView.ts`)
`az = / el = / bank =` are view3d's built-in slider readouts, created on a board from `JSXGraph.initBoard` in `createBoard`, which does not go through `GraphSession`. They are `visibility:hidden` (checked on the old preview, patches/tensor, 1440x900), so never seen. Now `applyBoardTextDefaults(board)` runs right after `initBoard`; all 33 non-MathJax texts on /patches/tensor compute to Literata.

## Tests
`CorrelationGraph.host.test.tsx` (tick strips, other line, hidden on narrow), `jsxSurfaceView.test.ts` (readout face). Pre-fix failures: tick strip `expected false to be true`; hidden `expected undefined to be true`; readout `az = 0.00: expected 'Arial, Helvetica, Geneva, sans-serif' to contain 'Literata'`.
Screenshots: `.command-logs/h2-fix/` (`pre-correlation-390.png` public site, `post-correlation-{sl,en}-{390,desktop}-{y,both}.png`, `post-tensor-desktop.png`).
