# CG-B3-4b: L6 envelope lesson

Evidence for the [L6 lesson](../../specs/curve-geometry-lessons.md) on `curve-envelope`: seven steps, 15 frames, chapter section and registration. Lesson text is [one-shot](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31). Written by curves handler 55 on 2026-11-06.

## Commits

| Commit | Work |
| --- | --- |
| `5d771db8` | Lesson, chapter section, registration (`lesson: false` removed), inventory entry, smoke row |
| `c0a53ccf` | `curveGeometryGuidedLessons.envelope.test.ts`, 13 real-graph tests; 10 mutations each failed a test. Fixes: `ENVELOPE_VIEW` and the English control names |

The spec's five steps became seven: its sample counts split into "more lines" and "reveal", and the collinear case of acceptance 3 got its own step. Nothing in the spec is dropped.

## Mathematics

The handler derived the default curve's formulas before dispatch, and the reviewer derived them again: \(Q_0=(1-t,0)\), \(Q_1=(0,t)\), \(\frac{x}{1-t}+\frac{y}{t}=1\), \(B(t)=((1-t)^2,t^2)\), \(\sqrt x+\sqrt y=1\), \(B'(\tfrac12)=(-1,1)\), and step 5's \(B(\tfrac12)=(\tfrac34,\tfrac34)\). Real-graph tests compare the touching point with an independent Bernstein evaluation at six \(t\) in every non-collinear scene.

## Review

`bezeg-reviewer` (Sonnet) on `5d771db8`.

- **Fixed: the English text named controls by their Slovenian labels,** eight places.
- **Open for CG-B3-5: `curveEnvelopeExpectedFor` in the inventory script is a guess.** It expects four segments, but the family is one curve element. The capture checks this.
- **Left: step 6 says the board and inspector state the collinear note.** A narrow board omits it; the inspector and live region always carry it. One-shot text, for the owner's rewrite.

## Browser check

`bezeg-smoke` (Sonnet) walked all 15 frames at 1440×900 and 390×844 in Slovenian and steps 4 and 6 in English on `5d771db8`: no console error, no horizontal scroll, drags and the \(t\) slider work, closing restores the graph, backward navigation restores the hidden curve. `just smoke-lesson curve-envelope` passes on `c0a53ccf`.

- **Fixed by the handler, from a screenshot the walk called a minor legibility note: the view was far too wide.** The curve took 120 px of a 1000 px board, so 200 lines read as a blot. `ENVELOPE_VIEW` is now `[-1.7, 2.4, 2.7, -0.3]`, twice the scale. The brief had pushed the worker to place the curve low, and a passing view test could not see this.
- **False alarms:** an English "raw" flag came from the worker's own check, `'\('` being `'('` in JavaScript. Its log read 47 family points on step 1, which is 16 lines; on the live board data, `numberPoints` and the SVG path all show 4 lines on frames 1 and 2 and after going back, and the real-session test agrees. The cause of that log line was not found.

Coverage limits: the full walk ran before the view change; after it the handler viewed steps 3's two frames at 1440×900 and reran the smoke row, which includes 390×844 in English. Steps 5 and 7 at 390 px were checked by coordinates, not by eye. No real touch.

### Layout findings for the gate

- With the panel open on step 3's explanation frame, the panel covers the top of the curve; the observation frame shows it all.
- At 200 lines the family fills the corner, and the curve has the same colour as the lines, so it reads only as the fill's edge.
- At 1440×900 step 6's note crosses the y axis on the board; see also [CG-B3-4a](cg-b3-4a-graph.md#review-and-smoke-findings).
- At 390×844 the \(t\) slider is below the board, so they are not on screen together, and the chip covers the caption. Both are family-wide.
