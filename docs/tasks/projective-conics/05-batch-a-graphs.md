# 05 Batch A graphs: K1–K3 (F2a)

Gate: none, because projective graphs add no function model and no curve object. Depends on 01–03. Decisions: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §2–4.

- Graph classes under `src/graphs/projective/` for the cross-ratio (K1), Pascal and Pappus (K2) and the pole and polar (K3). Each provides its contract's graph needs, explicit board and listener ownership, and keyboard parameter stepping.
- A new family Preset collection module (ADR 0016). Presets store the example id, grid points and table indices. They are validated on import, with an actionable error.
- Unit and component tests. No route yet.
- Measure dragging per the [performance plan](../../performance-plan.md), then fix the pencil table size and the sample density. Record the numbers in ADR 0033 or in a follow-up ADR.
- Engineering and UI/accessibility review.

## Slices (handler plan, 2026-10-31)

Run in order, one worker each. Each slice follows `src/graphs/compgeo/` (`PointSetGraph`, `pointSetPresetCollection`) for board ownership, language switching and Preset validation.

| Slice | Content | Status |
| --- | --- | --- |
| 05a | Family Preset collection module and the K1 cross-ratio graph: two lines, a centre and four grid points, rays, images, an exact fraction readout with a decimal, and status texts for an image at infinity or an undefined projection. Shared helpers for ideal-point markers go in `src/graphs/projective/`. Locale keys go in one projective block in `sl.ts`/`en.ts`. | accepted 2026-10-31 |
| 05b | K3 pole and polar graph. The conic selector draws through `sampleConic`. It shows tangents, tangency markers, the polar, the exact inside, on or outside status, and the equation readouts. | accepted 2026-10-31 |
| 05c | K2 Pascal and Pappus graph: six parameter handles through `conicPencil`, the hexagon, the Pascal points and line, a determinant readout, and intersections at infinity. | planned |
| 05d | Drag measurement per the performance plan. It fixes `DEFAULT_SAMPLE_DENSITY` and `DIRECTION_BOUND` and records the numbers in ADR 0033 or a follow-up ADR. It also checks the open sampler notes from [task 03](03-conic-sampler.md#acceptance-record-2026-10-31). | planned |

## 05a acceptance record (2026-10-31)

- **Worker:** `src/graphs/projective/` holds the K1 graph, its controls and model, `idealMarker`, `projectiveValidation`, and the generic `projectivePresetCollection(key, parse)`, which K2 and K3 each extend with one parser. There are 32 `projective_*` keys after `pointset_invalid_overlays` in `sl.ts` and `en.ts`. The Preset key is `projective-cross-ratio`; its `PresetImport` registration waits for the route slice. The worker observed 10 mutations fail. An 11th, dropping the second-line centre check, is equivalent, because `project()` already reports `centre-on-line`.
- **Engineering and UI review (Sonnet):** no must-fix. The repair worker fixed the findings:
  - The view box is now `[-14, 9, 14, -7]`, because the harmonic and infinity examples lay outside the old box.
  - An imperative in the Slovenian ideal-point status is now a statement.
  - The unmount test now asserts that the board objects are gone; before the fix it failed with 7 handles left.
  - There is a test for import and Reset; both clear the selection.
  - An imported `example` whose values differ from the named example is stored as `custom`.
  - The live region covers only the status and the ratios, and a separate polite region announces each nudge.
  - Selecting a handle in the inspector moves focus to the board.
  - The lines are labelled `p` and `p′`.

  The handler observed the view-box test and the `custom` test fail under their mutations.
- **Patterns for 05b and 05c:** the example-fit test, the `example` consistency check, the narrow live region, the import and Reset test, and focus handed back to the board.
- **Checks:**
  - Passed: `just unit src/graphs/projective src/localization src/projective`, `just lint`, and `just check-localization` (typecheck and build).
  - The full unit suite was not run locally for this slice; hosted CI runs it after the push.
- **Unverified until the route slice (06):** browser layout, including the label offsets and the readout widths; touch dragging; screen-reader behaviour of the two status regions.

## 05b acceptance record (2026-10-31)

- **Worker:** `src/graphs/projective/` holds `PolePolarGraph`, its controls, model, edit and text modules, and their tests. `polePolarPresetCollection` uses the Preset key `projective-pole-polar`; its `PresetImport` registration waits for the route slice. The locale keys are `projective_k3_*` plus `projective_invalid_unknown_conic` and `projective_invalid_zero_direction`, inside the projective block.
- **Settled choices:**
  - The four conics are the ellipse \(9x^2+25y^2-225\) (the default), the circle \(x^2+y^2-25\), the parabola \(x^2-4y\) and the hyperbola \(9x^2-16y^2-144\).
  - \(P\) lies on a \(\tfrac15\) grid, stored as integer numerators over 5 with a limit of \(\pm50\). An ideal \(P\) is an integer direction, with a limit of 5.
  - The view box is `[-12, 10.5, 12, -10.5]`.
  - Shift steps a finite \(P\) by 1.
  - The conic is drawn as one polyline from `sampleConic`, with a NaN break between pieces.
  - The tangents from the hyperbola's centre are its asymptotes; their ideal tangency points have no marker.
- **Contract K3:**
  - Acceptance 1–4 are unit-tested, including the default numbers: the polar \(3x+35y-75\), \(T_1=(4,\tfrac95)\), \(T_2=(-3,\tfrac{12}5)\), and the tangents \(4x+5y-25\) and \(-9x+20y-75\).
  - Every rational outside grid point has residuals of exactly zero, and an irrational case shows the numerical readout with \(10^{-9}\).
  - The parabola's centre is ideal with direction \((0,1)\); no finite centre is drawn.
  - The worker observed 10 mutations fail; one more was equivalent.
- **Review (Sonnet, engineering, UI and mathematics):**
  - **Must-fix:** a polar equal to the line at infinity was drawn as \(y=-1\) and printed as a constant-only equation. This happened for \(P\) at a central conic's centre and for the parabola's ideal axis point. Now the line is hidden and the readout says it is the line at infinity. When that point is on the parabola, the status says its tangent is the line at infinity.
  - **Should-fix:** a test now checks the NaN break in the hyperbola polyline.
  - The repair worker observed the new tests fail under the old behaviour.
  - The handler replaced *stožernica* with the agreed *stožnica* (see the [term table](README.md)) in 8 Slovenian strings.
- **Checks:** `just unit src/graphs/projective src/localization src/projective`, `just lint` and `just check-localization` (typecheck and build) passed; the handler reran them. The full unit suite is left to hosted CI.
- **Unverified until route slice 06:**
  - Browser layout: board texts are anchored at \(x=-11.6\), and the two joined tangent equations make the widest line.
  - Pointer dragging; the NaN pen break in a real browser; the numerical tangent lines on screen.
  - The status regions with a screen reader.
- **Not covered:** contract step 6, the pole of a line, has no separate graph mode. The lesson (task 07) can show it with the same picture, since \(P\) is the pole of its drawn polar.
