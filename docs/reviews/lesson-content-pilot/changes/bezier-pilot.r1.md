# bezier-pilot: changes r0 to r1

Hook: "Krivulja ima štiri točke, a gre skozi samo dve. Kako si izbere pot, kam ne more?" (merged-findings, bezier hook). Steps 6 to 4.

- [besedilo] Title and summary now pose the question instead of stating a result. Reason: shared finding 1 (no hook).
- [struktura] Old step 1 (endpoints, trivial) merged into new step 1 as a drag task: pull \(P_1\) away, which points does the curve still pass through. Reason: curious "too trivial", reluctant "Agency 1".
- [besedilo] "Točke niso nujno na krivulji" no longer told before the student tries. Reason: 4e curiosity in all three reviews.
- [struktura] Old step 2 (polygon/hull) is now step 2, with no Bernstein weights or set formula; hull explained as a stretched rubber band, and the prompt is an attempt to leave the hull. Reason: reluctant quit point, struggling "formula wall".
- [struktura] Old steps 3 (endpoints) and 5 (influence) dropped; their content moved into steps 1 and 3. Reason: struggling "steps 5 and 6 do not follow from 4"; reluctant "repeated formulas as filler".
- [struktura] Old step 4 (evaluation at 1/2) is new step 3, reframed as the answer to "why is the curve stuck in the hull": drag \(P_0\) then \(P_1\) and compare the effect on the marked point. Frame order changed to explanation, observation, calculation (calculation after the experiment, framed as optional). Reason: shared finding 3, curious fix 2, struggling "where do the weights come from". The "arithmetic mean" aside is dropped.
- [struktura] Old step 6 (free analysis) is new step 4: recap in three short sentences plus the challenge "put all four points on a line". Reason: finding 2, all three "Ending 1".
- [besedilo] Removed the repeated formula blocks and the coordinate recital in prose; one formula remains, in the calculation frame. Reason: findings 3 and 6.

## Runtime proposals / assumptions

- Assumes the marked \(t=\tfrac12\) point follows the control points while dragging (curve-evaluation action), and that frames may be ordered explanation, observation, calculation. Please confirm; otherwise move the calculation frame before the observation.
- Assumes points are labelled \(P_0\) to \(P_3\) on screen, as r0 did.
- Step 4 scene needs no new action; the existing default scene with polygon and hull is used.
