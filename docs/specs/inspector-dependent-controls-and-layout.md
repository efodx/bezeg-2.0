# Inspector: dependent controls and layout at 310 px

Status: in progress (lesson-card-layout stream, handler 4, 2026-11-20).

Source: sections 3 and 6 of the [lesson bug crawl triage](../reviews/lesson-bug-crawl/triage.md), assigned to this stream by the owner on 2026-11-20. Rules: [the controls catalogue](../controls.md), [shared graph controls](shared-graph-controls.md) (decision 13: an unavailable control states its reason), [DESIGN.md](../../DESIGN.md#graph-controls).

## Goal

A control that does nothing visible in the current state says why, next to itself. An inspector panel at 310 px has no falsely repeated select value, no row of buttons of different heights, no word broken in the middle, no wrapped value name, and fields that share their edges.

## Blocker triage (2026-11-20, master at ae52664f)

Every item was opened on the production build at 1440×900 (inspector 310 px), all three tabs, plus the state the item names. Screenshots: `.shots/insp/before/` (untracked); scripts `.shots/insp/tabs.cjs`, `scenes.cjs`, `measure.cjs`.

| ID | Item | State on master | Repair |
| --- | --- | --- | --- |
| D1 | complex-roots: test point z does nothing until revealed | Present. The only mention is a clause in the help under the degree stepper, in another group | R1 |
| D2 | complex-reciprocal: centre c and radius r do nothing until the circle is revealed | Present in part. A permanent help line under r says it; c sits in another group with no line | R1 |
| D3 | projective three-views: angle slider unavailable with no hint | Repaired. The slider is `unavailableReason` and shows "Kot je na voljo, ko je točka P na krožnici vključena." | none |
| D4 | rational Farin lesson does not say where the switch is | Repaired. The text names the Prikaz tab (`familyChapters.ts:72`), and the route opens with the points shown (graph-control-first-use O9) | none |
| D5 | Voronoi construction buttons unavailable with no reason; Shrani import looks disabled | Repaired. A line under the buttons says "Izberi mesto, da pokažeš gradnjo njegove celice."; Import and Export look alike | none |
| D6 | PH Edit shows an empty "Odmiki krivulje" | Repaired. The section says to switch the offsets on in Prikaz | none |
| D7 | orientation add mode shows no pressed state | Not reproduced. The button is `aria-pressed` and takes the dark selected fill | none |
| L1 | Simson "Primer", radical-axis "Konstrukcija" truncate; the value is repeated as help | Changed. `ChoiceSelect` repeats the selected text under the select when it measures it as clipped. The measurement subtracts the arrow twice, so values that fit are repeated too (Simson: both selects; probability summary: quartile rule). The radical-axis value really is cut and its repetition is the designed fallback | R2 |
| L2 | Bézier subdivision point block, comb and envelope hint cut at the panel bottom | Not a defect. The panel scrolls and keeps a scrollbar gutter; headless captures hide the scrollbar | none |
| L3 | circle-constructions coordinate rows misaligned | Present. Each point is its own list, and the name column is as wide as its name: the fields of O₁ start 8 px right of those of P. The same on complex-roots (w, z) and complex-reciprocal | R3 |
| L4 | CLT buttons wrap | Present. Wrapping inside a button is the designed behaviour of the equal-column row, but the buttons of one row have different heights (`align-items: center`). The same on Fortune, de Boor and every three-button playback row | R4 |
| L5 | probability summary "Vrednost 1–7" labels wrap | Present. `ValueListInput` gives the name a fixed 4.5 rem column | R5 |
| L6 | orientation add/remove grid ragged | Present. "Dodajanje z dotikom ali klikom" takes three lines in a half-width button; the two rows are 40 and 58 px tall. Shared `PointCollection`: Simson, Fortune, Voronoi, hull routes | R6 |
| L7 | repeated subdivision "Krivulja" buttons ragged; Krivulja10 looks selected | Ragged: present (flex wrap, widths follow the label). Selected look: not a defect, it was the pointer's hover | R7 |
| L8 | inconsistent stepper styles (de Boor, least squares) | Present by design, partly. Both are `CountSetter`; a typeable count shows a field, a step-only count a shaded readout. Their widths differ (88 and 40 px), so the + buttons of two steppers in one panel do not line up | R8 |
| L9 | linear function: unavailable empty boxes with squeezed help | Present. For a vertical line each of the two half-width fields shows the same three-sentence reason (five lines each), and the readout shows it a third time | R9 |
| L10 | Shrani tab mixes three button sizes | Present: the primary action, the two-line export/import pair, the small SVG and PNG | R10 |
| N1 | found here: complex-roots "Pokaži preizkusno točko" breaks inside a word ("preizkusn/o") in its 76 px button | Present | R11 |
| N2 | found here: on Simson the label of the ε slider touches the bounds of the slider above it | Present | R12 |

## Repairs

Shared controls (one owner):

- **R2 `ChoiceSelect`.** The selected text counts as clipped only when it does not end before the dropdown arrow. The select's right padding already reserves the arrow, so the room is the client width minus the left padding minus the arrow (16 px) and its inset (8 px), not minus the right padding as well. The controls fixture's clipping check follows the same rule.
- **R3 `PointListInput`.** The name column has a minimum width that holds a two-character name (O₁, p₀), so lists of one- and two-character names in one panel start their fields at the same x.
- **R4 button rows.** In `.control-row--fill` and `.inspector-playback` the buttons of one row share one height.
- **R5 `ValueListInput`.** The name column is as wide as its longest name; a name stays on one line.
- **R6 `PointCollection`.** The row that holds the add-mode toggle stacks: Clear all and the toggle are each full width, each label on one line at 310 px.
- **R7 curve picker.** Curve buttons sit in equal columns, every row starting at the left edge; "Prekliči izbiro" keeps its place after them.
- **R8 `CountSetter`.** The step-only readout is as wide as the typeable field, so stacked steppers share the position of their + button. The readout keeps its shaded look: it still says "not typeable".
- **R10 Shrani.** The image export buttons use the same two-column row as the export/import pair, so the tab has the primary size and one secondary size.

Routes:

- **R1 complex-roots and complex-reciprocal.** While the test point (roots) or the inversion circle (reciprocal) is hidden, a line directly under its fields says that it is hidden and which button shows it; the line is linked to the fields (`aria-describedby`) where the control allows it, and goes when the object is shown. On reciprocal, c and r form one group so one line covers both. The clause about visibility leaves the unrelated help line. Rejected: revealing the object when a field is edited (it would break predict-then-reveal, and lesson scenes set z while it is hidden); hiding the fields (they are the keyboard path to set the point before revealing it, and the panel would jump).
- **R11 complex-roots.** The reveal button reads "Pokaži točko z" / "Skrij točko z" (English "Show point z" / "Hide point z"): the row above it is already named "Preizkusna točka z". Every text that names the button follows (help, legend, lesson prose, tests, recipes).
- **R9 linear function.** For a vertical line the reason is shown once, full width, under the k and n fields, and both fields are linked to it (`reasonShownElsewhere`, `describedBy`). The readout does not repeat the same sentence.
- **R12 Simson.** The ε slider keeps the 12 px control gap from the slider above it.

No stored preset field, route or lesson id changes. No new Slovenian term: the new lines reuse "skrita", "Pokaži …" and the names already on the panel.

## Acceptance

1. D1: on `/complex-roots` with the test point hidden, the line is visible directly under the z row and names the reveal button; after "Pokaži točko z" it is gone; typing z while hidden still commits the value. A unit test covers both states and failed before the change.
2. D2: the same on `/complex-reciprocal` for c and r in one group, with a unit test.
3. R2: at 310 px no select on `/simson-line` and `/probability/summary` repeats a value that is fully drawn, and the radical-axis construction on `/circle-constructions` still shows its full text under the select. A zoomed screenshot shows Simson's text complete and clear of the arrow.
4. R3: on `/circle-constructions` (radical axis) the x fields of O₁, O₂, O₃ and P start within 1 px of each other; the same for w and z on `/complex-roots`.
5. R4: on `/probability/clt`, `/compgeo/fortune` and `/bspline/deboor` the three buttons of the first row have one height.
6. R5: on `/probability/summary` every "Vrednost n" is on one line and each row is one control high.
7. R6: on `/compgeo/orientation` every button of the point collection is one line high at 310 px except "Odstrani izbrano točko" (at most two), and the buttons of a row share a height.
8. R7: on `/bezier/subdivision` after four subdivisions the 16 curve buttons form equal columns.
9. R8: on `/bspline/deboor` and `/interpolation/least-squares` the + buttons of the two steppers have the same x.
10. R9: on `/functions/linear` with P1 and P2 on one vertical line the reason appears once in the Edit tab, full width.
11. R10: the Shrani tab shows two button sizes.
12. R11: no button label in the Razkritja row of `/complex-roots` breaks inside a word at 310 px.
13. R12: on `/simson-line` the ε label is 12 px below the slider above it.
14. Nothing regresses at phone width: `just controls-fixture` passes, and the handler looks at a 310 px screenshot of every changed panel and a 390 px one of the shared controls.
15. `just check-changed` passes; the lesson smoke rows of lessons on the changed routes pass.
