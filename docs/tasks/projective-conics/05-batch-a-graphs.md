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
| 05a | Family Preset collection module and the K1 cross-ratio graph: two lines, a centre and four grid points, rays, images, an exact fraction readout with a decimal, and status texts for an image at infinity or an undefined projection. Shared helpers for ideal-point markers go in `src/graphs/projective/`. Locale keys go in one projective block in `sl.ts`/`en.ts`. | planned |
| 05b | K3 pole and polar graph. The conic selector draws through `sampleConic`. It shows tangents, tangency markers, the polar, the exact inside, on or outside status, and the equation readouts. | planned |
| 05c | K2 Pascal and Pappus graph: six parameter handles through `conicPencil`, the hexagon, the Pascal points and line, a determinant readout, and intersections at infinity. | planned |
| 05d | Drag measurement per the performance plan. It fixes `DEFAULT_SAMPLE_DENSITY` and `DIRECTION_BOUND` and records the numbers in ADR 0033 or a follow-up ADR. It also checks the open sampler notes from [task 03](03-conic-sampler.md#acceptance-record-2026-10-31). | planned |
