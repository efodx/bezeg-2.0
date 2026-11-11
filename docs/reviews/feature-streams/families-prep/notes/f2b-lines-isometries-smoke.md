# F2b line-geometry and isometries smoke (partial, budget handoff)

Checkout: worktree stream-families-prep, HEAD 680dbc37 (dirty). Served by `just preview 4321` (production preview, started and stopped by this run). Browser: Playwright Chromium, headless, fresh context per run. Scripts and logs: `.command-logs/f2b-li-smoke/`.

Stopped early at the project budget handoff, so coverage is partial.

## Results

| Item | line-geometry SL desk | line-geometry EN desk | isometries SL desk | isometries EN desk | EN/SL 390x844 |
| --- | --- | --- | --- | --- | --- |
| 1 Catalog card | links to route, no console error (SL only) | not run | links to route (SL only) | not run | not run |
| 2 Drag | PASS (P -2,1 to 4,-3) | PASS (Q 4,4 to 8,0) | PASS (P 2,1 to 9,-3) | PASS (same) | FAIL/unverified: drag did not move the point in any of 4 runs; script hit-test suspected, not a product finding yet |
| 2 Valid edit | PASS | PASS | PASS | PASS | PASS |
| 2 Out-of-range edit | PASS: refused, "Vnesi celo število med −8 in 8.", aria-invalid=true | PASS: "Enter a whole number between −8 and 8." | PASS: "Vnesi vrednost med −16 in 16." | PASS: "Enter a value between −16 and 16." | PASS |
| 2 Modes/checkboxes | n/a | n/a | PASS: 5 modes selected; rosette 1 and frieze 4 checkboxes toggled once each | ran modes; no checkbox toggle | n/a |
| 3 Reset | PASS (button "Ponastavi prednastavitev") | PASS ("Reset preset") | PASS | PASS | PASS |
| 4 Preset save/change/reopen | PASS | PASS | PASS | PASS | not run |
| 4 Export and import (SL desk) | PASS: presets.txt 710 B; import validated, collection listed | n/a | PASS: 1151 B; listed | n/a | n/a |
| 5 Tab order (SL desk) | PASS: P x, P y, Q x, Q y; focus ring visible | n/a | PASS: mirror inputs in order; ring visible | n/a | n/a |
| 6 Overflow at 390 | n/a | PASS: scrollWidth 390 = clientWidth; 19 controls, none unreachable | n/a | PASS: 23 controls, none unreachable | PASS both langs and both routes |
| 6 Board in viewport at load | n/a | PASS: board box top 253 to 549 at 844 height | n/a | PASS | PASS |
| 7 Legend | FAIL/gap: no legend element or board legend in the default view; screenshot at `line-geometry-sl-desk-board.png` shows only the line, points and labels | not run | FAIL/gap: no legend; labels "zrcalo 1", "slika 1", "slika 2" are drawn as text and overlap near the origin; screenshot `isometries-sl-desk-board.png` | not run | n/a |

Console: no error or warning captured in any run.

## Not covered or incomplete

- Item 1 for EN and the family heading text were not verified; the probe only confirmed the card links to each route under the SL family headings "Premica v ravnini" and "Izometrije ravnine". The brief names "Geometrija ravnine" and "Maps"; the probe did not show those family headings.
- Item 2 drag at 390 is unresolved (see table).
- Item 4 at 390, and the EN import/export round-trip, not run (SL only was required).
- Item 5 in EN and item 5 at 390 not run.
- Item 7 legend: no legend found on either route; EN screenshots not taken.
- Mirror/modes EN checkbox toggling for isometries not run.
- Board labels overlap near origin on isometries (observation only).

## Next steps for the handler

- Decide whether the routes should have a legend (item 7 cannot pass without one).
- Recheck 390 drag with a point the test can reach.
- Confirm the family headings for item 1 in both languages.
