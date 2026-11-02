# F6 browser smoke: computational geometry (ear-clipping, interval-sweep, segment-intersections)

Target: http://127.0.0.1:4313/bezeg-2.0 (production preview, handler-run). Revision 790f8440 (docs-only dirty tree, src unchanged).
Browser: Playwright Chromium headless, 1280x720 desktop, one fresh context per script; 390x844 for the narrow check. Duration about 30 minutes (budget 25, slightly over).
Raw data: this directory's `f6-smoke/*.json` (a=trace/refusal, b=lesson SL, d=EN/live switch, g=keyboard/preset, h=export/narrow/highlight, i=chapters) and PNGs.
Console errors / page errors: none in any script (all `errs: []`).

Abbreviations: EC = ear-clipping, IS = interval-sweep, SI = segment-intersections.

| # | Check | EC | IS | SI |
|---|---|---|---|---|
| 1 | Deep link + reload | Passed: board (110 svg nodes) + inspector, same after reload, step 1 | Passed (121 nodes) | Passed (115 nodes) |
| 2 | Trace next/play/pause/reset, edit resets | Passed: 1->2->3; Play ran to 8, label "Premor", Pause held at 8; Reset 1; arrow-key edit of P4.x 3->4 at step 5 gave step 1 and "Predvajaj", still 1 after 2 s. Entry: step 1, "Predvajaj", not playing | Passed: 1->2->3, play to 11, pause stable, reset 1; edit b.left 2->3 at step 7 reset to 1, paused | Passed: same pattern (play to 11; edit s2.x2 6->7 reset to 1, paused) |
| 2b | Highlight on step | Passed: board pixels changed on 3 of 4 Next presses (step-2 text "ni ušesa" etc.) | Passed: 4 of 4 | Passed: 4 of 4 |
| 3 | Precondition refusal | Passed: P4=(6,2) -> "Stranice večkotnika se sekajo ali dotikajo. Premaknite oglišča, da bo večkotnik enostaven; rezanje ušes zahteva enostaven večkotnik." and "Večkotnik ni enostaven: stranici 2 in 3 se stikata ali sekata."; P4=(7,-1) -> same plus "stranici 1 in 4 ...". Value kept (edit visible, message shown, not silent). Collinear case reports as touching/non-simple, no distinct "collinear" wording | Passed: b=[4,4] zero-length accepted, no refusal; trace restarted, step count 26 -> 25 | Passed: s2=(3,2)-(9,6) over s1 -> "Pometanje je zavrnjeno: daljici s1 in s2 se prekrivata v daljici, ne v točki. Premakni eno od njiju." |
| 4 | Guided lesson SL (enter, advance, back, exit) | Passed: entered via "Spoznaj to demonstracijo"; 5x next frame (lesson 1/7..3/7; frame 4 ran graph action: trace to "Korak 4 od 12"); back one frame returned to same text/trace 4/12; exit via Končaj shows confirm "Zapustiti vodeni primer?"; "Zapusti in povrni graf" restored the edited entry scene (P4.x=4, lesson had forced 3) | Passed: same flow; board pixels changed on step 3/7 action; edited scene (b.left=3) restored after lesson forced 2 | Passed: trace to "Korak 12 od 47" at lesson step 3/7; back ok; edited s2.x2=7 restored after lesson set 6 |
| 5 | EN lesson + live SL->EN switch | Passed: at lesson step 3/7 trace 4/12 switch kept step, scene values, trace step ("Step 4 of 12"); prose, lesson chrome ("Return to chapter", "Exit", "Next frame"), aria labels, panel labels all English; EN next/prev frames worked; EN fresh entry fully English. Only SL text: language option "Slovenščina" (correct) | Passed: step 3/7 + "Step 7 of 26" kept; all English (regex hits were English words only) | Passed: step 3/7 + "Step 12 of 47" kept; no Slovenian |
| 6 | Keyboard only | Passed: Tab reached Next step (outline solid 3px), Enter 1->2, Space 2->3; Tab to Play, Space starts (3->7, "Premor"), Enter stops; Tab to Reset, Enter -> 1 | Passed (same: Enter/Space steps, play to 9, pause, reset) | Passed (same) |
| 7 | Preset save/reopen/delete | Passed: edited P4.x=4, saved "smoke-f6-ear-clipping" via Shrani dialog, reload showed default 3, select preset -> 4; Izbriši + confirm "Da" removed it (options back to "Privzeta") | Passed (smoke-f6-interval-sweep; 3 restored, deleted) | Passed (smoke-f6-segment-intersections; 7 restored, deleted) |
| 8 | Figure export | Passed: SVG izvoz.svg 18479 B, 34 path/circle/line/text elements, labels P1..P5, 5 path/polygon elements, valid svg root; PNG izvoz.png 24001 B, valid PNG signature, 848x476 | Skipped (one route only) | Skipped (one route only) |
| 9 | 390px viewport | Passed: scrollWidth=clientWidth=390 (also in lesson mode); board 364 px wide inside viewport; Next step reachable and advanced 1->2. Screenshots ear-clipping-390*.png | Skipped | Skipped |
| 10 | Chapter pages SL/EN + lesson links | Passed: /learn/triangulations-voronoi in SL ("Triangulacije in Voronojevi diagrami") and EN; link "Vodeni primer"/"Guided example" lands on /compgeo/ear-clipping?example=... with lesson panel and board | Passed: /learn/sweep-algorithms SL+EN, link lands on interval-sweep with panel | Passed for page presence in SL+EN; segment-intersections link listed and href correct, but only the first link per chapter was clicked (SI link click not exercised) |

## Counts
Passed 28 cells (incl. 2b), Failed 0, Blocked 0, Skipped 4 (8 and 9 for IS/SI, by design).

## Observations (not failures)
- After exiting a lesson, the URL keeps `?learnChapter=...&learnSection=...` (only `learn=1` is dropped). Harmless but leaves stale params; reload would not re-enter the lesson.
- Ear-clipping collinear consecutive vertices are reported with the generic "touching or crossing, not simple" message, not a collinear-specific one.
- Untranslated strings found: none (only "Slovenščina", the language's own name). Chapter-page EN text was not scanned for Slovenian beyond heading/link text.
- Coverage limits: no touch/physical device; no mouse-drag of points (edits via numeric fields and arrow keys); highlight verified by pixel change, not by reading specific colours; separate fresh contexts per check so presets never touched a shared profile.

## Cleanup
Only Playwright scripts launched Chromium; each exited (no chrome/chromium processes remain, no smoke node scripts remain). The handler's preview (PID 104292 / 95336 group) was left running. Presets were created and deleted inside throwaway contexts only.
