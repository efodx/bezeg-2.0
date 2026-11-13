# lm-c labels (composition-mode label placement)

- `labelLayout.ts`: new `compositionLabelRequests(view)` (ids `c`, `t0..t3`, `p0..p3`, priority c, T(P_i), P_i; `c` only when a pivot is stored). `placeLabels` unchanged (it already avoids other requests' anchors).
- `compositionBoard.ts`: context gains `placement(id)`; the nine labels use `pointLabel(() => ctx.placement(id), ...)`. No new board objects.
- `LinearMapGraph.tsx`: `labelCells()` also handles `composition` (memo key: source, image, pivot, box, canvas size, font size); wiring `placement: id => this.labelCell(id, "above-left")`.
- `labelLayout.test.ts`: step-4 state (R about (3,1)): fixed old cells overlap (red case, 2 sizes); placed cells have no overlap and stay inside the board at 930x450, 350x300, 1100x700 and the measured 390-px board (364x295, box +-11.105 x +-9).
- Not solved: at 390 px the 16.4 px/unit board is too crowded for a free cell for every label; the placer falls back to its relaxed levels, so some labels sit on other markers (no label-label overlap by estimate, some touching). An intermediate level (ticks relaxed, markers kept) would help but changes eigen/ellipse fallback behaviour; not done.
- The guided card PNG for composition-affine would change (labels moved): handler recaptures.

## Handler 19
Accepted: at 1366 px no label overlaps (`labels/s4-1366.png`), unit `src/graphs/linear` green after the last test edit, card PNG unchanged (cards draw no point labels; manifest stamp change discarded). Owed: at 390 px labels still sit on markers (relaxed fallback levels ignore points; a level that keeps points but drops ticks would change eigen/ellipse too).

## 390 px
- `labelLayout.ts` `placeLabels`: the old level 2 (ticks and points allowed) is replaced by `fewestHits`: levels 0-2 now never take a cell over another labelled point; when none exists, a bounded branch and bound takes the overlap-free assignment with the lowest cost (point hit = 20 tick hits), then the penalty greedy (point hit weighs 20). Desktop placements are unchanged (1366 L5 step-4 cells pinned in a test; eigen/ellipse tests unchanged).
- Tests at 364x295: L5 step 1 (rotation then reflection, translation), eigen N and E (every 15 degrees), ellipse N: no label overlap, no label on a marker. L5 step 4 (R about (3,1)) has no free assignment (c has one clear cell); the best covers one marker (test allows 1). Red on the old placer (step 1: 4 labels on markers), green after.
- Screenshots `.command-logs/lm-c/labels390/`: step 4 shows T(P_2) touching a tick number, no label over a marker; eigen E and ellipse N clean (sigma_2 sits at the origin, no other label near).
- L7 inset: not checked (it does not import `labelLayout`).
Handler 19: accepted; at 390 px L5 step 1 some labels drift a cell away from their points (T(P_0) top-left of its marker): owed, no overlaps.
