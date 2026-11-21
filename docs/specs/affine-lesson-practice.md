# Guided lessons: practice beside the task, and the affine comparison

Status: implemented (lesson-card-layout stream, handler 6, 2026-11-21). Open: at 390×844 the label \(B(	frac12)\) still lies on the \(p_2\)/\(p_3\) labels of the opening frame (see the label collision spec's results); a pair of crosses closer than 12 px is named once, "c, c′".

Source: an independent walkthrough of the English lesson "Affine transformations of a Bézier curve" (relayed by the owner on 2026-11-21, who asked to fix the points the handler agrees with). The handler agrees with all three.

1. "The lesson asked me to apply a transformation while the controls were hidden." Interacting with the graph or pressing Hide collapsed the instructions and revealed the tools, so the task was no longer in view.
2. "The quarter-turn asks learners to find the fixed centre, but the plot leaves it unmarked. Mark the pivot and keep a faint outline of the original curve so learners can compare both states. On the opening plot, the B(1/2) label also overlaps p₂."
3. "For the same value of t, show the point obtained by transforming B(t) and the point obtained by evaluating the transformed curve. Give both coordinates."

## A. Observation frames are worked with the tools

Today an observation frame (`frame.kind === 'observation'`, session status `explore`) shows its title, prompt and revealable answers in the docked card, while the tools column under the card is hidden and graph edits are locked until the card is hidden, which hides the prompt.

Decision: on an observation frame the open card is the task card. It takes the completion card's place above the live tools (the layout `lesson-complete` already uses: card first in the tools column, tools live below it; below the graph in one column), the lesson mode is `explore` (graph and tools unlocked), and the graph catcher that hides the card on a graph click is absent, so working on the graph keeps the task in view. Back, Next, Hide, Exit and the docking aids are unchanged. A frame action button, animation controls and expected observations keep working. Reading frames (explanation, calculation) keep today's docked card with hidden tools. A suggested "Try it" button is not needed: the controls are beside the prompt as soon as the frame opens.

Acceptance:

1. On every observation frame at 1440×900 the prompt and the tools are both visible, the tools are not dimmed or inert, and a graph drag or a tools button press changes the graph without hiding the card. At 390×844 the card follows the graph and the tools follow the card.
2. Explanation and calculation frames are unchanged (tools hidden, edits locked, catcher present).
3. Moving from an observation frame to a reading frame with Next or Back locks again; Hide and reopen keep their behaviour; Exit restores the pre-lesson state; the lesson smoke suites pass, with tests that asserted hidden tools on observation frames moved to the new contract and a new test seen failing on the old code.
4. ADR 0061, DESIGN.md "Guided lesson reading card", `docs/specs/guided-lessons.md` and `docs/capabilities.md` describe the task card.

## B. The affine graph shows the starting curve and the centre

`src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx`. The reference curve is the curve as the scene or the route left it before any transformation (after a lesson scene's `affine-transform` actions it is the scene's fixture before those actions; after Reset it is the reset curve). Dragging a control point by hand ends the comparison: the reference becomes the current curve.

1. While the curve differs from its reference, the reference curve and its control polygon are drawn faint and dashed behind the curve, without markers or labels, not draggable, not in the legend's interactive targets.
2. The centre of the turn (the mean of the control points, which `rotate()` uses) is marked with a small cross and the label \(c\); when the centre of scaling (the bounding-box centre, which `scale()` uses) differs from it by more than half a pixel, it gets its own cross. Both are placed with `src/graphs/legend/pointNamePlacement.ts` and never cover a marker or another label.
3. On the opening frame of the lesson, the label \(B(\tfrac{1}{2})\) does not overlap the label or marker of \(p_2\) (check after the LC-9 placement of `AbstractJXGPointControlledCurve`, which this graph inherits).

## C. The two computations of one curve point

While a curve point \(B(t)\) is shown and the curve differs from its reference, the graph tracks the composed affine map \(T\) applied since the reference (translations, turns and scalings about their centres, composed as a 2×3 matrix in the order applied) and shows, in the tools column under a heading, two readouts with coordinates rounded to two decimals in the app's number format:

- \(T(B(t))\): the reference curve evaluated at \(t\), then mapped by \(T\);
- \(B_T(t)\): the transformed control points evaluated at \(t\).

Both are computed independently. A small hollow ring marks \(T(B(t))\) on top of the filled marker of \(B_T(t)\). A unit test checks the agreement to \(10^{-9}\) for the lesson's composed scene (translate \((-2,-1)\), quarter-turn, scale \(2\), \(t=\tfrac34\)) and for one other sequence, and checks \(T\) against hand-computed images of two control points.

## Out of scope

Other graphs' observation frames beyond the runtime rule A; new lesson text (the existing prompts already ask for these comparisons); English and Slovenian strings beyond the new readout and mark labels, chosen by [choosing new terms](../localization.md#choosing-new-terms).
