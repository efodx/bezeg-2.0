# Smoke 03 presenter (commit e082af01)

Target: http://127.0.0.1:4483/bezeg-2.0/ (handler's dev server; revision not verified by worker). Chromium via Playwright, 1440x900, fresh context per script. Raw log: 03-presenter.log; scripts 03-*.cjs; downloads 03-dl/.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Triangle centres board clicks | Pass | P1 drag moved (0,0)->(1,1). With 2 points and click-add toggle on: click on readouts card 2->2; click on empty board 2->3. (Default 3-point layout cannot add; max 3.) |
| 2 | Coons camera | Pass (weak signal) | Empty-board drag changed view; drag from card body left the view visually identical (crops 03-c0/03-c1, 34 B pixel noise); idle control unchanged. |
| 3 | Figure export | Pass | Taylor and triangle-centres SVG: no Odcitki/Legenda/board-card text; PNG viewed (Taylor): graph only, plus the export's own in-board formula text (not a card). |
| 4 | Card shell (Taylor) | Partly fail | Fold/unfold OK. Keyboard Enter, arrows (Shift = large), Enter: snaps to left / bottom-centre / top-centre / right anchors; aria-live text "Kartica ... je izbrana za premik..." / "odložena" / "preklican" / Home "spet na privzetem mestu". Pointer drag from title: to left anchor, right anchor, free spot (grab offset kept). FAIL: pointer-down on the grip button does nothing, only the title or empty head area drags. Reload keeps free placement and fold (localStorage `bezeg-2.0:board-layout`). Reset button and Home restore the default. Minor: after fold and reload, widths changed 282 -> 194. |
| 5 | Slider sweep (Taylor) | FAIL | Odcitki width 282.2 -> 290 -> 290.2 over slider 0 sweep [-2,2] (readout text grows). Second slider: constant. |
| 6 | Presentation mode | Pass | Cards shown (x=1087, width 290), fold toggles, keyboard pickup announces. Pointer drag in presentation not re-tested (my drag used the grip). |
| 7 | Chapter activity | Pass with note | /learn/bezier-curves#parameter -> "Vodeni primer" -> /bezier/decasteljau?example=activity... loads, legend card shown, 0 errors. The guided-lesson-graph-catcher covers the card until clicked (then fold works). |
| 8 | Load errors, 8 routes | Pass | 0 console/page errors on all eight. Taylor showed its visible cards only after about 3.5 s at first load (a later run showed them within 1.5 s). |

Other: a hidden measuring layer of card duplicates stays in the DOM at x=-100000 (unclassed), doubling `[data-card-id]` matches.

## Recheck 1 (Taylor, after fixes)

Scripts: 03-recheck1.cjs, 03-recheck1-cls.cjs; log 03-recheck1.log; crop 03-recheck1-drag.png.

1. Pass. Grip drag from (763,313) to (170,700): card x 763 -> 63, y stayed 313 (target y not reached; card moved horizontally, so the grip starts a drag). Pointer-down on fold, moved 100,200: card unmoved (763,313), not folded.
2. Fail. Slider range [-2,2], step 0.1, 21 positions: width min 282.17, max 290.17. Constant only up to 0.6; jumps to 290.14 at 0.8 and stays there. Card width varies by 8 px.
3. Pass. Open 282.17; folded 282.17; after reload 282.17 (folded); unfolded after reload 282.17 (difference 0).
4. Fail (count). After slider to max and 1 s: 3 aria-live elements in .board-cards-layer. Inside the shown Odcitki card: 2 - a visually-hidden polite readout region (ws-readouts, text "Središče c 0. Stopnja n 1. Točka x 1. Polinom ...") and the board-card-status region (empty). Outside the card: one board-card-status (empty). Offscreen measure layer (x < -1000): 0 aria-live elements. The readout region is the only non-status live region in the card.
5. Pass. Removed key bezeg-2.0:board-layout (storage key is prefixed; code constant is board-layout). Remaining board-layout keys: 0.

Console/page errors during recheck: none.

## Recheck 2 (card width under value sweeps)

Culprit: the signed-error and absolute-error rows on Taylor are FormattedValue (formatSignificant text), which reserved no width; their cell only grew with the text (grow-only min width), so the card went 282.17 -> 290.17 when the first slider reached 0.8 (value cell 41 -> 49 px). Fix: numberReserve gives numeric-looking formatted text a fixed 12ch (src/workspace/cards/ReadoutsBody.tsx). Unit test: cardBodies.test.tsx numberReserve.

| Route / control | Before | After |
| --- | --- | --- |
| analysis/taylor, slider 0 over [-2,2], 21 steps | 282.17 -> 290.17 | 319.36 constant (min = max) |
| linear-map, matrix text inputs a,b,c,d, 32 values | 319.36 constant | 319.36 constant |
| analysis/phase-portrait, slider 0 over [0,6], 21 steps | 319.36 constant | 319.36 constant |

Linear map and phase portrait have no FormattedValue numbers in their card, so they were already constant. localStorage key bezeg-2.0:board-layout cleared in each run.
