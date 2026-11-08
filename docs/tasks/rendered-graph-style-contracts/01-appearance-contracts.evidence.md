# Evidence: rendered appearance contracts (task 1)

Worker run 2026-11-08. Files: `src/graphs/styles/RenderedPointRoles.test.ts` (unit, real JSXGraph SVG renderer), `tests/rendered-appearance.smoke.spec.cjs` (production browser, 3 tests). No production code changed.

## Role table (criteria 1, 4, 8)

Unit test, one real board per role, attributes read from the drawn `<ellipse>` (`fill`, `stroke`, `stroke-width` > 0, `rx` > 0). Expected colours are literal hex values, plus one test tying them to `GraphPalette`.

| Role | Fill | Outline |
| --- | --- | --- |
| editable | #bd8040 | #fffdf5 |
| fixed/derived | #87977f | #fffdf5 |
| spline join | #748975 | #fffdf5 |
| result | #bf8542 | #fffdf5 |
| construction level 0 / 2 | #98a494 / #7186a2 | #fffdf5 |
| hodograph (PH auxiliary style) | #bd8040 | #fffdf5 |

PH auxiliary test: hodograph marker on its own board keeps fill/outline, is smaller than the main marker at size 8, and is unchanged (and not hidden) when the main board's point is hidden. Each test frees its board and removes its container in `finally`; `matchMedia` is restored in `afterEach`.
Also: size setting 4 then 0 grows then restores the rendered marker; coordinates and bounding box unchanged.

## Mutation results (criterion 2)

- Unit, `color: GraphPalette.controlPoint` added to the point style (the JSXGraph colour alias): 9 failed / 4 passed, for example `expected '#bd8040' to be '#fffdf5'` (editable) and `expected '#bd8040' to be '#87977f'` (fixed). The existing `PointStyles.test.ts` regression also failed. Log `.command-logs/s3a-mut1.log`. Restored; unit suite passes.
- Browser, same alias mutation: hover/selection test failed (`Expected >= 3 / Received 0` ordinary markers) and export test failed (`Expected "#bd8040"`, received the outline colours). The size test passed, as intended. Log `s3a-mut3.log`.
- Browser, `highlightStrokeColor` set to the normal outline: hover test failed (`Expected "#654c2b" / Received "#fffdf5"`). Log `s3a-mut2.log`.
All mutations were reverted (PointStyles.ts shows no diff).

## Browser contracts (route `/bezeg-2.0/rational/base`, English)

- Criterion 3: an unselected point on hover takes fill #d39a4a and outline #654c2b, restoring #bd8040/#fffdf5 on leaving; Next weight moves the selected style to another point and restores the previous. Point coordinates and bounding box equal before/after.
- Criterion 7: "Element sizes" slider 0 to 4 enlarges every visible control marker (rx 5 to 9) with the same colours, then restores exactly; "Point labels" off removes all 4 point labels (axis labels excluded), on restores. Geometry unchanged throughout.
- Criterion 5 (real SVG download through Save > SVG): 4 control markers with fill/outline/stroke width as the live scene; 4 `g.bezeg-math-labels` typeset formulas (glyph paths present) each within 1.5 px of its live formula box; no background rect; rendering the file leaves both corner pixels alpha 0 and marker centre pixels within 24/channel of the live fill. Hidden-point `foreignObject` not used as evidence.
- Criterion 6 (real PNG download through Save > PNG): decodes at 848x476 (scale 1.0 of the 847.6x475.2 board); both corners exactly (255,253,245,255) = boardSurface, opaque; marker centre pixels within 24/channel of live fills; palette-pixel counts: curve #587445 (tol 24) > 300 (observed 1034), control fill #bd8040 (tol 12) > 100 (192), label #4d594f (tol 24) > 150 (579).

Tolerances: colour 24 per channel (12 for the marker fill count), label position 1.5 px, PNG height rounding 1 px; counts are lower bounds at roughly a third of the observed value. No whole-image hash.

## Skipped or not covered

- Construction/result levels are covered in the unit renderer only; no browser export of a De Casteljau route.
- PH auxiliary board in the browser export: not exercised (the hodograph board is not part of the figure export); covered at unit level only.
- Light/dark or other routes, physical devices, other languages.
- Lesson restoration and export ownership checks were not rerun here.
