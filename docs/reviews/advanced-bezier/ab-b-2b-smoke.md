# AB-B-2b browser smoke (revision 8f6fb8fb, preview 127.0.0.1:4314/bezeg-2.0)

Captures in `C:\Users\1337Hacker\.claude\jobs\8a98675a\tmp\smoke` (q1-board-zoom.png, q1-step10-zoom.png, q1-step16-zoom.png, q2-table-390.png, q2-table-1920.png, q2-page-*.png, q10-focus.png). Scripts there too. Chromium via Playwright; Slovenian unless stated.

## Answers
1. Grey dashes: NO, they do not hide or blur dashed B. Step 5 (q1-board-zoom): discarded grey only on A's ends, B stays orange beaded/dashed. Step 16 (q1-step16-zoom): discarded B parts are grey dashes at B's upper left, kept B is thick orange; clearly told apart. Minor: discarded A is a thin solid grey line, where it crosses discarded B near (0.5, 1.5) both grey, so B's dashes are less obvious there. The B dash pattern is dense (reads as beads at this size).
2. Table styling: fits. Tangent pair 10^-10 at end: 1920x1080 scrollWidth 1920 = viewport, table 280 px wide in a 280 px panel; 390x844 scrollWidth 390 = viewport, table 336 px in 336 px panel. No clipped cells, no overflow ancestors, no wrapping; header Vrsta / Obseg A / Obseg B. The "Se 21" further row is plain text under the table (q2-table-390.png), slightly unstyled but fine. Also 1440: scrollWidth 1440.
3. Tangent pair (A=(0,0),(2,4),(4,0); B=(0,4),(2,0),(4,4)), run to end of Next:
   - 10^-10: 505 steps; final status `limit` ("Dosezena je meja rezanja. To ni dokaz v nobeno smer; ..."), clips 200, 8 rows (1 Rezultat 0,5-0,5 / 0,5-0,5, plus 7 "Neresen par" 0,5-0,5 both), further row "Se 21". Mid-run at step 201 it was running with 108 clips, so the end values are real, not a loop cap (my loop cap was 2000).
   - 10^-6: 134 steps; `found`, 113 clips, 1 row: Rezultat 0,499999-0,500001 on both curves; no further row.
   - 10^-3: 62 steps; `found`, 53 clips, 1 row: Rezultat 0,499112-0,500888 (A), 0,499599-0,500401 (B); no further row.

## Checks
1. Route: passed. No page or console error. H1/breadcrumb "Presecisca z Bezierovim rezanjem". NOTE `document.title` is just "Bezeg" (site-wide, on the catalog page too); if the brief meant document.title, it is not route specific. Catalog card (/demonstrations, id demonstration-card-bezier-clipping) is under "Bezierjeve Krivulje", no img (empty preview stage), only an "Odpri" link, no lesson link.
2. Crossing pair 10^-6: passed. 25 Next presses, step 26 of 26, status `found`, clips 21, 2 rows: Rezultat 0,25-0,25 / 0,25-0,25 and 0,75-0,75 / 0,75-0,75 (both curves). Start: `overlapping`, step 1 of 26.
3. Q1: passed (see answer).
4. Q2: passed (see answer).
5. Q3: passed (see answer).
6. Offset pair 10^-6: passed. Start `overlapping`, step 1 of 22; end step 22 of 22, `empty` ("Prazno: vsi obsegi so zavrzeni, krivulji se ne sekata."), clips 17, 0 rows.
   Import note: import is a dialog (Shrani tab, "Uvozi prednastavitve" opens it, file input inside, then "Uvozi"). Coordinates are in grid-step integers, so the offset pair with gridStepExponent -1 is stored as A=(0,0),(20,40),(40,0), B=(0,45),(20,5),(40,45); first attempt with decimals 4.5 was correctly rejected with an actionable message ("koordinati x in y morata biti celi stevili"). The Default preset exports as `{}`; a saved preset exports the format.
7. Drag resets: passed. Mid-play at step 6 dragged B1 (2,-1) to (3,-1): step 1 od 25 (run length changed), status running -> overlapping, clips 4 -> 0, button back to Predvajaj and no advance after 1.2 s, inset SVG markup changed. Tolerance change 10^-6 -> 10^-8 at step 5 of 25 while playing: step 1 od 26, paused, overlapping, clips 0, inset changed, stayed paused.
8. Play/Pause/Reset: passed. Play advanced about one step per 0.5 s poll (steps skipped between samples only due to my sampling), reached 26 of 26 `found`; at the end Next and Play are aria-disabled=true, Reset enabled. Pause at step 5 held for 1.5 s; Reset -> step 1, Reset then aria-disabled=true.
9. Language: passed. Mid-run (step 7 of 26) SL->EN: status "Clipping is running. The live ranges are still narrowing.", "Step 7 of 26", "Clips: 5", "Widest live range: 1", rows "Live pair", inset caption "Distance of A to the fat line of B ...", tolerance label "Tolerance". Step, bounding box and point positions unchanged; EN->SL restored identical status, caption, step and board.
10. Keyboard: passed. Tolerance select focusable, ArrowDown changes 6->7 and resets to step 1; Tab goes Next -> Play -> Reset; Shift+Tab back. Enter and Space both press Next (step 3 after two presses); Enter toggles Play/Premor and pauses; Enter on Reset resets. Visible focus ring on all: solid 3px rgb(87,124,195) outline (q10-focus.png not opened).

## Gaps
Only Chromium at the listed sizes; no touch drag; no full-checklist run; poster absence confirmed only as no img in the card; focus screenshot and q2-table-1920/q2-page images were not opened (measured instead).
