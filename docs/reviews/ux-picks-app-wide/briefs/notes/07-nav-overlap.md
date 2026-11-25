# 07 nav overlap (strip over the lesson Back/Next)

Cause: phase-portrait lesson, board 1230x411 (1280x720). Strip slots are 155 px tall and 1120 wide; beside the lesson card they wrap to
two rows (318 px). Even with the right column folded to heads (133 px) the strip would reach into it, so `fits` failed for rules 2f/2h/2i
and `layoutBoard` fell back to `plain`, where the lesson (floor `anchorMin` 288) cannot shrink to the 69 px above the strip: the strip
covered the lesson's nav row. Fix (boardLayout.ts, end of `layoutBoard`): rule 2i gets a last step. If the fully folded beside layout
is in bounds and clear of the left column, it is used even though the strip covers other columns' folded heads.
Test: src/workspace/layout/boardLayoutLessonStrip.test.ts (red first: 07-nav-unit-red.log). Probe: smoke/07-nav-overlap.cjs,
results smoke/07-nav-overlap.log (all six lessons, three sizes: 0 overlaps). Trade-off: at 1280x720 the strip now covers part of the
right column's lower heads (Orodja, Legenda) in the phase-portrait lesson; the learner can still reach readouts head.
