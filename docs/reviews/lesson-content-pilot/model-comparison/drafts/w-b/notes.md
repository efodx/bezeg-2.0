# Notes (w-b), partial

Status: three of four lessons written. `polynomial-zeros-guided.md` is NOT written (budget handoff before drafting it).

## Hooks and step counts

- bezier-pilot (6 steps): "Krivulja ne zadene večine svojih točk. Kako si izbere pot in kam ne more?" Answer in the last step: weighted mixture of all points, fixed ends, hull. Challenge: nearly straight curve.
- subdivision-guided (5 steps): "Ali lahko krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila?" Step 3 has the student press Subdiviziraj. Final challenge: drag a point of the blue piece and see that the orange one stays.
- curve-curvature-guided (5 steps): "Zakaj se začetek bolj zavije kot konec, in kako to izmerimo s številom?" Dropped the Frenet frame, parabola step and the formula wall. The "why" is the endpoint formula, shown as an experiment on `p_2`, with the formula only in an optional calculation frame.

## Unconfirmed

- Point labels: the board names points `p_i` in lowercase (`PointStyles.ts:127`), so the drafts use `\(p_i\)`, not `P_i`/`b_i` as r0 does.
- Slider "Parameter t" and "Parameter subdivizije t" and the button "Subdiviziraj": names confirmed in `sl.ts`; "pod grafom" for their location is taken from the style brief, not checked.
- Curvature readout is board text at the top left of the graph (`CurvatureOverlay.ts`); confirmed.
- Subdivision step 5 assumes control points of the blue piece are draggable after a cut (only operations are disabled in `Attributes.bezierDisabled`); not run.
- Step 3 of subdivision relies on the student pressing the button; scene sets only t=0.5.
- Curvature step 3 and 5 assume `p_0`..`p_3` of the cubic fixture are draggable and labelled; not run.
- Calculation frames come after the observation frame in bezier step 4 and curvature step 3; assumes the frame order is free.
