# Wave 2 smoke, group b (compgeo)

Preview http://localhost:4327/bezeg-2.0/ (commit a474efb2, build 07a8f40d), Chromium 1280x800 desktop, SL then EN. Scripts and logs: `.command-logs/w2-smoke-b/` (run*.cjs). Zero console errors on all six routes.

| Route | 1 load | 2 controls | 3 refusal once | 4 keyboard | 5 SL/EN |
|---|---|---|---|---|---|
| point-set-triangulation | pass | pass: edge select (14 options) changes selection; Flip swaps P2-P5 for P1-P6 | pass: P2-P7 non-convex refusal shown once visibly (plus hidden live copy); hull edge refusal too | pass: select focus, ArrowDown changes value | pass: "No edge selected", scene kept |
| segment-intersections | pass | pass: Next 1->2->3, Play (button becomes "Premor"), Pause holds step, Reset to "Korak 1 od 47" | pass: Add disabled at 12 with visible "Doseženo je največje število daljic (12)..."; Clear gives "Ni daljic" text | pass: Enter on Next keeps focus | pass: Next step/Play/Reset |
| monotone-partition | pass | pass: example select 1<->2 (15->21 steps), "Korak 1 od 15" at start, Play/Pause, Reset | n/a | pass | pass |
| voronoi | pass | partial, see F1 | pass: query "0,33" -> "Zaokroženo na 0,25", point (1/4, 2); 99999999999 -> "Vnesi vrednost med -33554432 in 33554432" | pass: focus stays on Play/Pause button (Premor after Play, Predvajaj after Pause) | pass: "Bisector 1 of 6" and back |
| voronoi-degenerate | pass | pass: mode select Sites/Four points, example select (4 options), four-point readout present, absent in Sites mode | n/a | pass | pass |
| fortune | pass | pass: example select (5 options), Next, Play/Pause, Reset | n/a | pass | pass |

Fit (toolbar "Prilagodi točkam") restores the scene frame after zoom/pan on fortune, voronoi, voronoi-degenerate (bounding box returns to initial). No "Reset view" / "Pokaži vse" button on monotone, fortune; Voronoi only has "Ponastavi primer" (example reset).

## Findings
- F1 (brief mismatch, not a console failure): /compgeo/voronoi shows no example or mode select (only hidden Prikaz selects). Code renders them only when examples exist / on degenerate. Query list, construction and Fit work.
- F2 (minor wording): segment-intersections Remove-selected unavailable reason reads "Nobena točka ni izbrana." (point, not segment).
- F3 (minor): fortune live text contains a doubled period ("...nad vsemi.. Obalna črta").
- Live region lags the visible step by about a second during playing/pause; settles correctly.

## Not covered
Touch viewport; mid-play language switch; Fit framing judged by bounding box only (no visual screenshot review); no-flippable-edge case reached only via Clear (shows "Ni robov za izbiro." plus triangulation help).
