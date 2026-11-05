# F6 Batch 3 smoke, geometry handler 54 (bezier-hulls lesson and route)
Target http://127.0.0.1:4313/bezeg-2.0/ (preview, working tree dirty). Playwright Chromium, fresh context per script. Scripts s1..s11.cjs, lib.cjs in this folder.

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Lesson SL, 7 steps, readouts | Pass | sl-step1..7.png. 1 of 1 (s1, 3 frames); 4 pairs no verdict (s2, s3); 2 of 4; 8 of 256; 1 of 256; s7 and finish 1 of 1. No raw \( on any frame. |
| 2 | Live SL->EN on step 5; back from 6 | Pass | EN "Piece pairs that remain: 8 of 256", en-step5.png; back to SL fine. Back from step 6 frame 1 returns to step 5 frame 3, 8 of 256, board screenshot hash identical. |
| 3 | Twin curves | Pass with note | Typed (0,0),(4,8),(8,0),(1,6),(5,-2),(9,6): last step 2 of 256 (also on the route, step 9 of 9). twin.png. Notes below. |
| Ch | Chapter convexity-hulls, SL/EN, 1440/390 | Pass | bezier-hulls is last of 7 sections; math renders (mjx, no raw TeX); no horizontal scroll. Return link from lesson: focus returns to launching link id, URL #bezier-hulls, section in view, all 4 combos. |
| 4 | Deep link, reload, stopped, exit restores | Pass | Both open, step 1 of 9, "Predvajaj" shown. Moved A_1 y=7, step 3, opened lesson (reset), Koncaj + "Zapusti in povrni graf": points and step 3 restored. |
| 5 | Preset save/reload/restore/delete | Pass | smoke-* preset: points and step 3 of 9 restored after reload. Delete needs the "Da" confirmation, then removed. Contexts were throwaway. |
| 6 | Drag at last step, pieces on | Pass | Set B_0=(0,0) so a control point lies inside a kept piece (default points are never inside one). Step 9, 2 of 256; drag B_0 -> (1,1): moved, step back to 1 of 9. drag-before/after.png |
| 7 | SVG and PNG export | Pass | smoke-*.svg 36 KB, .png 58 KB downloaded. |
| 8 | Figure in board 1366x768, 390x844 | Pass | All 14 curve paths inside #jgbox, SL and EN. depth4.png. |
| 9 | Console errors; regression | Pass | No page or console errors. /compgeo/convex-hull, /hull-robustness open. |

## Observations (not failures)
- Lesson step 7: the numeric fields and inspector are inert while the lesson card is shown ("Not enabled" to Playwright). They work after "Skrij". Step 5 tells the student to try the twin; the text does not say to hide the card first. Board dragging works with the card visible only where the card does not cover.
- Step 7 frame 1: the card covers the lower part of the picture (A_0, A_2 axis area).
- Twin in lesson view: A_1 (4,8) is above the visible area and its control lines run off the top; curves themselves stay in view. "Prilagodi tockam" fits it (twin-route-fit.png).
- Koncaj in the chapter flow returns to /compgeo/bezier-hulls (graph), not the chapter; the owner return link returns to the chapter with focus.
- Catalog poster: not counted.
Counts: pass 10, fail 0, blocked 0, skipped 0. Not tested: physical touch, drag at 390.
