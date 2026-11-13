# lm-c labels (composition-mode label placement)

- `labelLayout.ts`: new `compositionLabelRequests(view)` (ids `c`, `t0..t3`, `p0..p3`, priority c, T(P_i), P_i; `c` only when a pivot is stored). `placeLabels` unchanged (it already avoids other requests' anchors).
- `compositionBoard.ts`: context gains `placement(id)`; the nine labels use `pointLabel(() => ctx.placement(id), ...)`. No new board objects.
- `LinearMapGraph.tsx`: `labelCells()` also handles `composition` (memo key: source, image, pivot, box, canvas size, font size); wiring `placement: id => this.labelCell(id, "above-left")`.
- `labelLayout.test.ts`: step-4 state (R about (3,1)): fixed old cells overlap (red case, 2 sizes); placed cells have no overlap and stay inside the board at 930x450, 350x300, 1100x700 and the measured 390-px board (364x295, box +-11.105 x +-9).
- Not solved: at 390 px the 16.4 px/unit board is too crowded for a free cell for every label; the placer falls back to its relaxed levels, so some labels sit on other markers (no label-label overlap by estimate, some touching). An intermediate level (ticks relaxed, markers kept) would help but changes eigen/ellipse fallback behaviour; not done.
- The guided card PNG for composition-affine would change (labels moved): handler recaptures.

## Handler 19
Accepted: at 1366 px no label overlaps (`labels/s4-1366.png`), unit `src/graphs/linear` green after the last test edit, card PNG unchanged (cards draw no point labels; manifest stamp change discarded). Owed: at 390 px labels still sit on markers (relaxed fallback levels ignore points; a level that keeps points but drops ticks would change eigen/ellipse too).
