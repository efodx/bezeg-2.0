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
| 05b | K3 pole and polar graph. The conic selector draws through `sampleConic`. It shows tangents, tangency markers, the polar, the exact inside, on or outside status, and the equation readouts. | planned |
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
