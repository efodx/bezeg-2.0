# CG-B3-6: Batch 3 gate

**Passed: Batch 3 released, family 1 complete.** Handler 57, 2026-11-06. Code at `fe1c0dc9` (layer repair) and `82ee0a7d` (poster). Audit: [criterion audit](cg-b3-6-criterion-audit.md). This record takes each of its gaps in turn.

## Layer repair

At 200 lines the family covered the Bézier curve, which read only as the fill's edge. The family's `dataCurve` in `EnvelopeOverlay.ts` now has `layer: 4`, under the curve on layer 5. The highlighted segment stays on layer 5. The audit's and CG-B3-4b's "same colour" wording was out of date: the curve is `primaryCurve` green, the family `comparisonCurve` blue, so order was the only problem.

`CurveEnvelopeGraphReal.test.tsx` "drawing order" compares the layers on the real board, and failed with `layer: 4` removed. At 1440×900 and at 3× zoom the green curve lies above the family along its whole length. The `curve-envelope` poster was recaptured and viewed. Manifest delta by script: only that capture's checksum and the provenance fields changed, the other 114 captures and all motions are identical. The chapter card hides the curve and did not change.

## Accessibility

Browser pass on a production preview of `82ee0a7d`, clean, by `bezeg-smoke` Sonnet.

| Check | Result |
| --- | --- |
| Keyboard, `curve-envelope` | Tab reaches both sliders and all three switches. Arrow keys, Home and End change the sliders, the caption and the board; Space toggles the switches. Focus ring visible. Accessible names come from the visible labels |
| Keyboard, `curve-offset` | The same for both sliders, the curve select and the switches. "Vzporednica" changes the board. "Osti" and "Graf faktorja hitrosti" were reached and toggled, but at \(d=-\tfrac14\) there is no cusp to hide, and the plot's element was not located, so their effect in the browser is not confirmed by this pass; unit tests cover both |
| Live region | One change about 500 ms after 8 key presses, on both routes, with the right decimal mark in SL and EN |
| Narrow 390×844 | No horizontal overflow; sliders reachable and working from the keyboard |

Colour alone, read from greyscale screenshots:

| Pair | Told apart by | Disposition |
| --- | --- | --- |
| Curve and family | Width, and now order. At 200 lines both are a grey mass with the curve as its thick edge | Accepted; the lesson's own step at 200 lines names the edge |
| Highlighted line and family | Width | Passes |
| Touching point and control points | Position and labels: control points carry \(p_i\), the touching point lies on the curve and has none | Accepted: no colour-only reading is asked for, and the caption states \(t\) |
| Sampled offset and its base | Dash against solid | Passes |
| Sampled and exact PH offset | Dash against solid, stated by the caption | Passes |
| Exact PH offset and the base curve | Both solid, same weight: position only. The base curve carries the control polygon and points | Accepted: separated by \(\lvert d\rvert\), and the caption names the lines |
| Cusps | Diamond markers and the count in the caption | Passes |

## Browser pass

- **Language switch:** on both routes an edited value and the board persist through SL, EN, SL, and so does the collinear note.
- **Whole-pixel collinear drag:** at 1440×900, 13 integer targets within one pixel of the line show the note; two pixels away do not; dragging away clears it. **At 390×844 smoke reported a failure, which the handler did not reproduce.** One rerun driven from the live board's coordinates dropped the point on (195, 454), giving \((0.5000, 0.5011)\): the live region and the inspector both state the note. Smoke's case came from a different pointer position, and its cause was not traced. The board caption omits the note at this width on purpose (`captionLines`), and the inspector shows it to sighted users.
- **"Krivulja" double toggle:** smoke saw different pixels after two toggles. The handler compared the board's SVG nodes before and after: identical, so this is not a state bug.
- **English walks:** `curve-offset` (6 steps, 13 frames) and `curve-envelope` (7 steps, 15 frames) walked to completion at 1280×720, with no Slovenian text left. This closes the audit's English rows. Smoke queried step 3's prompt in L5 against a caption at \(-\tfrac12\): the prompt asks the learner to move \(d\), so the caption is right.
- **Chapter and catalog:** both sections and cards load in SL and EN. `/demonstrations` has 116 images, none broken after scrolling, the `curve-envelope` poster at 720×440, no errors.
- **Splines regression:** `/spline/c1spline` shows its board and a drag moves the curve.
- No console errors or failed requests on any page.

## Records

- **L6 steps:** the spec now lists the seven shipped steps.
- **L5 circle arc:** settled as text only, and the spec says so: a quadratic Bézier is a parabola, so it cannot draw one. Prediction is all the step asks.
- **L5 lesson numbers:** one `bezeg-reviewer` Sonnet derived them before reading the tests and found no discrepancy: the conventions, the cusps at \(d=-\tfrac12\) and \(d=-1\), the evolute match, cusp counts per scene, and the same numbers in both languages. The handler repeated the \(d=-1\) values by hand. Not checked by that pass: the PH "almost coincide" claim, and whether the threshold cusp is detected in floating point. `curveGeometryGuidedLessons.offset.test.ts` compares the sampled and exact offsets on the board to 1e-7 and expects one cusp at \(d=-	frac12\); the browser walk read "Cusps: 1" there.
- **Preset and route pin:** no new test needed; the audit's row was too cautious. `PresetCatalog.test.tsx` lists every accepted collection key as literals, and `demonstrations.test.ts` compares the whole catalog with a literal path list. Both fail if an old id or route goes.
- **L6-A2:** the measurement note stays in [CG-B3-4a](cg-b3-4a-graph.md#measurement); the inspector states the limit of 200 lines.

## Layout findings

None blocks release. Each stays as it is unless noted.

| Finding | Scope | Disposition |
| --- | --- | --- |
| Family at 200 lines hides the curve (L6) | This batch | Fixed above |
| L5 step 5's calculation frame covers the cusps | Panel height, as in Batch 2's step 5 | Carried; the observation frame shows them |
| Panel clips long caption lines at 1440×900 (L5) | Family-wide, L3 and L4 too | Carried; "Opazuj na grafu" clears it |
| At 390×844 the panel hides the board until "Opazuj na grafu"; the chip covers the caption | Family-wide | Carried |
| At 390×844 long formulas scroll in their box (L5 step 5) | Shared runtime | Accepted: nothing is lost |
| PH scene: the panel covers the top control points | L5 | Accepted: both curves stay visible, and the PH curve is fixed there |
| L6 step 3: the panel covers the top of the curve | L6 | Accepted: the observation frame shows it all |
| Caption crosses a y tick label (390 px on "2.5", 1440 px on "2" in the collinear scene) | Board caption, family-wide | Carried; both stay legible |
| At 390×844 the \(t\) slider is below the board | Family-wide | Carried |

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `135ac9d7`, only this record dirty | Exit 0, 593 test files passed and 3 skipped, 10892 tests passed and 8 skipped, 1596 s |
| `smoke-lesson curve-offset curve-envelope` | Same | 4 of 4: the Slovenian desktop and English 390 px walks of both lessons |
| Browser pass above | `82ee0a7d`, clean | Passed, with the dispositions above |
| Mutation | | Removing `layer: 4` failed the new drawing-order test |
| Hosted CI | `f705b486` | Success, run 42141125109, deploy included |

## Hosted CI: unit shard over its limit

Run 42134860406 for `705b76f8` ended `cancelled`, and **deploy was skipped**, so `e92f9f44` and `8146bef0` did not reach Pages with it. No test failed: `unit (1)` reached its 15-minute job limit. Shard 1 took 9.3, 13.7, 12.8 and 14.7 minutes on the four runs before it, so the suite had outgrown two shards and a rerun would only have been luck. The workflow now runs three unit shards with the limit unchanged, so a hang still fails. `PartSequencer` takes the count from the configuration, and the `smoke` job reads the matrix result, so neither changed. On `f705b486` the shards took 12.3, 8.0 and 6.5 minutes. Shard 1 is still the longest, because the `*.partN.test.*` files fall on it unevenly.

## Not covered

No real touch device: narrow drags used mouse events. No real screen reader, so the announcements themselves are unverified, as in Batch 2. The English smoke row walks at 390 px and the desktop English walk is the smoke worker's own script, not a committed test.
