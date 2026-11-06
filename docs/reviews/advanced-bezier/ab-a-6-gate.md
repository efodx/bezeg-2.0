# AB-A-6: Batch A gate

**Passed: Batch A released (D1 `reduction`, D3 `arc-length-param`).** Handler 62, 2026-11-06. Audit: [criterion audit](ab-a-6-criterion-audit.md). The one code change is `be40684a`; its media follows in the commit of this record. Hosted CI of this push is read by the [handoff](../feature-streams/curves/handler-handoff-62.md).

## Repair: the reduced curve relied on colour

In greyscale the cubic and its reduced quadratic were both thin solid lines. They lie close together and comparing them is the point of the lesson. The reduced curve in `ReductionOverlay.ts` now has `dash: 3`; the elevated net keeps its thinner, shorter dash.

The test "the reduced curve is told from the curve by its dash" reads the real board and failed before the change. On the rebuilt preview the path has `stroke-dasharray` 10,10, and the handler viewed the greyscale screenshot: the two curves read apart. In the opening scene they coincide, and the dashes over the solid line show that.

The `reduction` poster and chapter card were recaptured and viewed. Manifest delta by script: of 117 captures only `reduction`'s checksum changed, and all 51 motions are identical. The card script refuses a partial run after a build change, so all three cards were captured: the other two keep their image checksums and gain new capture evidence.

## Audit gaps

| Gap | Disposition |
| --- | --- |
| D3-A5 quadrature setting | Closed: `ArcLengthParametrizationGraphReal.test.tsx:112` pins the text; the browser showed it in both languages |
| D1 max-norm coincidence | Not a gap: the lesson does not make the claim, and it is the spec's own note |
| D3 close restored only a checkpoint in the unit test | Closed in the browser: check 13 below |
| D1 and D3 free exploration step, structure only | Accepted: these steps assert nothing beyond their controls |
| D3 step 1 speed change, tested by no test | Closed in the browser: check 9 below |
| Farin not opened | Carried: already stated in the spec's Further Notes |
| *Ni nižljiva* beside the step 2 prediction | Carried, polish: [AB-A-3](ab-a-3-lessons.md) |
| No test that a drag renders no React in `ArcDetails` | Carried: 30 pointer moves took 638 ms on the preview; not a render count |
| "Presets unchanged" | Holds for every existing key; two collections were added |

## Browser pass

Production preview of `2845a375`, clean, by `bezeg-smoke` Sonnet, at 1440×900 and 390×844. Rechecks on `be40684a` by `bezeg-smoke` Haiku. No console error or failed request on any watched page; the first card-click pass and `/learn` were not watched.

| # | Check | Result |
| --- | --- | --- |
| 1 | Chapter, SL and EN | Three sections, three cards, images load, each opens its lesson. EN copy compared with the images; SL copy not read by eye |
| 2 | Catalog | 118 images, none broken; both posters 720×440, not clipped. `reduction` viewed against the live scene; `arc-length-param` not viewed here, but in [AB-A-5](ab-a-5-media.md#posters) |
| 3 | Strand | EN strand holds the chapter; SL title not checked separately |
| 4–7 | D1 drag, mode, switches, Reset, keyboard, live region | Passed: status, tolerance text and readouts follow; Reset returns the board pixel for pixel; one announcement after a burst, right decimal mark in SL and EN |
| 8 | Language switch with an edited curve | Readouts persist; point coordinates were not compared |
| 9 | D3 Play | Parameter mode: chord per 0.3 s falls from 0.455 to 0.230 at even \(t\). Arc mode: about 0.337 throughout. Pause keeps the position |
| 9 | Slider while playing | Reported failed, **not a defect**: the slider is `disabled` while playing, confirmed on the input, and works after Pause. The brief had taken its expectation from a code comment about undo |
| 10–12 | D3 controls, plot, labels, drag, keyboard, reduced motion | Passed: exact label only on PH; Gauss-Legendre with 24 points and 32 panels named; Play disabled under reduced motion |
| 13 | Closing both lessons | Passed through the UI, D3 by way of its PH step: the state returns and playback stays stopped. Playback was not started inside the lesson; `arcLengthGuidedLessons.test.tsx:401-458` covers that |
| 14 | Language switch mid-lesson | Passed; position kept; the EN check is a word list |
| 15 | `/bezier/elevation` | Drag and Preset save and restore pass |
| 15 | `/ph/cubic` | Reported failed, **not a defect**: its handles are \(w_0,w_1\) on the hodograph board. A real drag of \(w_0\) changes the curve. No file under `ph` changed in Batch A |
| 16 | 390×844 | No horizontal overflow; *Opazuj na grafu* works in both lessons (the first pass missed it); curve 86 px in D1, 124 px in D3. Controls not exercised on touch |

Colour alone: D3's marks differ by shape (filled circles, hollow squares). D1 is repaired above.

## Records

Worked-out lesson numbers need no new review: AB-A-3 reviewed them, and no mathematics changed here. No performance measurement is due: the spec asks one of D2 and D4 only. Card and poster text stays Slovenian on the English page, the open owner item "Slovenian-only card images".

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `just check` | `2845a375`, clean | Exit 0: 599 test files passed and 3 skipped, 11015 tests passed and 8 skipped, 1384 s, build passed |
| Lesson walks `reduction`, `arc-length-param` | `2845a375` | Inside hosted CI's `chromium` shards, not rerun locally |
| Hosted CI | `2845a375` | Success, run 42158824892, every job read, deploy included |
| `just unit src/graphs/curves/reduction` | `be40684a` | Passed |
| `just unit` on preview assets, `src/learning/chapter`, chapter test | Media tree | Passed |
| Mutation | | The dash test failed without `dash: 3` |

`just check` did not run on `be40684a`: the change after it is one attribute, one test and media. Hosted CI of this push is its first full run.

## Not covered

No real touch device and no real screen reader. The live language switch in D3 was not read for its live region in Slovenian.
