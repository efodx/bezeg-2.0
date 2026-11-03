# F6 browser smoke: sweep batch S2 (monotone-partition, monotone-triangulation)

Target: http://127.0.0.1:4313/bezeg-2.0 (handler-run production preview, build 3b5c93c1 dirty with tests/docs only; not started or stopped by this run).
Browser: Playwright Chromium headless, 1280x720 (390x844 for check 10), fresh context per script. Raw data `f6-s2-smoke/*.json`, scripts `*.mjs`, PNGs (a1=trace, a2/a3=edit and refusals, d=keyboard, e=export, f/f2=preset, g=lesson SL/EN/?learn=1, h=live switch, i=chapter, j=viewports). Console/page errors: none in any script (`errs: []`, no FATAL in the final JSON set).

MP = monotone-partition (C3, 8 steps, trace 14 steps), MT = monotone-triangulation (C4, 7 steps, trace 43 steps).

| # | Check | MP | MT |
|---|---|---|---|
| 1 | Deep link + reload | Passed: 112 svg nodes, "Korak 0 od 14", event queue visible; reload identical | Passed: 112 nodes, "Korak 0 od 43", "Faza: razdelitev"; reload identical |
| 2 | Trace controls | Passed: Next 1,2; Play shows "Premor", Pause held at 3 for 2 s; Play ran 3 to 14 in 5.7 s and returned to "Predvajaj", Next aria-disabled at end; Reset 0. Edit P1.x while playing at 3 gave 0 and "Predvajaj"; edit while paused at 2 gave 0 | Passed: same; Play ran to 43 in 20.6 s, phases seen "razdelitev", "triangulacija kosa 1 od 2", "triangulacija kosa 2 od 2" (boundary crossed); end text "Končano: večkotnik je razdeljen na trikotnike, njihovo število je 4."; edits reset to 0 and paused |
| 3 | Refusals | Passed: P4=(2,-3): "Razdelitev je zavrnjena: roba e2 in e4 se sekata ali dotikata..." + "Večkotnik ni enostaven: stranici 2 in 4 se stikata ali sekata."; P2=(4,0): "Razdelitev je zavrnjena: oglišče v2 leži na premici skozi sosednji oglišči. Premakni ga."; Clear / 2 points: "...večkotnik potrebuje vsaj tri oglišča. Dodaj oglišča." In all cases no step text, no queue/state panel, Next/Play aria-disabled=true | Passed: identical messages and behavior |
| 4 | Keyboard only | Passed: Tab order header, mode buttons, board (aria-label "Točke na mreži. Izbrano točko premakneš s puščičnimi tipkami..."), pan/zoom, hint, tabs, Next step; every stop solid 3px outline; Enter 0 to 1, Space 1 to 2; Play by Space ("Premor"), Enter paused at 3; Reset by Enter and Space; board focused with P2 selected, ArrowRight moved P2.x 4 to 5 and reset step 2 to 0 | Passed: same (43-step trace) |
| 5 | SVG/PNG export SL+EN | Passed: start SVG 23867 B (no types); mid SVG SL "v6 začetno, v4 začetno, v5 zlivno, v2 razcepno", EN "v6 start, v4 start, v5 merge, v2 split"; end adds "v1 končno/end, v3 končno/end" and diagonal labels 1, 2; PNG 848x476 signature OK (SL 39065 B, EN 37968 B) | Passed: mid SVG SL "v6 zgornje oglišče, v5 desna veriga, v2 desna veriga, v1 spodnje oglišče", EN "v6 top vertex, v5 right chain, ..., v1 bottom vertex"; end shows piece 2 ("v4 top vertex, v5 left chain..."); PNG 848x476 OK (SL 41385 B, EN 39883 B) |
| 6 | Preset save/reopen/delete | Passed: P4.x=11 saved "smoke-s2-mp"; reload showed 12, selecting preset restored 11; Izbriši + Da left only "Privzeta" | Passed: same ("smoke-s2-mt") |
| 7 | SL lesson walk | Passed: entry via "Spoznaj to demonstracijo" and via `?learn=1` (both URLs get learnChapter=sweep-algorithms&learnSection=...); 16 Next frames across 8 steps; step 2 (frames 1 and 2) shows 0 vertex-type labels, step 3 shows 3, step 5 four, step 6 six; Back twice returned 8/8 f2 then f1 then 7/8 f2 with matching board hash; Exit shows "Zapustiti vodeni primer?", "Zapusti in povrni graf" restored edited P4.x=11 (inputs and svg node count identical to pre-lesson) | Passed: 14 frames across 7 steps (starts at trace step 15 of 43, crosses to 43 at step 6); Back twice matched; exit restore P4.x=11 |
| 8 | EN lesson + live switch | Passed: EN walk identical ("Step k of 8 · Frame", "Leave the example?", "Continue example", "Exit and restore graph", restore OK). Live switch at 4/8 f2: step, trace "Step 6 of 14" and v-labels kept ("v6 start,v4 start,v5 merge"); Next worked in EN; back to SL fine. Only "diagonal(s)" matched my Slovenian-word scan (an English word) | Passed: live switch at 5/7 f2 (trace "Step 28 of 43"): "Phase: triangulation of piece 1 of 2", labels "v6 top vertex,v5 right chain...", "Diagonals so far (2): v2–v5, v2–v6"; no Slovenian left; Next to 6/7 (Step 43) and SL again fine. EN lesson-panel prose for n−2 triangle comparison not read in full (scan only) |
| 9 | Chapter `/learn/sweep-algorithms` SL/EN | Passed: H2 "Razdelitev na monotone večkotnike"/"Partitioning into monotone polygons"; "Vodeni primer →"/"Guided example →" link (`?example=lesson.sweep-algorithms.monotone-partition...`) opens lesson ("Korak 1 od 8 · Okvir 1 od 2" / "Step 1 of 8 · Frame 1 of 2"); "Nazaj v poglavje"/"Return to chapter" lands on #monotone-partition with the section heading in view | Passed: same for "Triangulacija monotonega večkotnika"/"Triangulating a monotone polygon" (1 of 7) |
| 10 | 1280x720 / 390x844 | Passed: 1280 and 390 scrollWidth=clientWidth; Next reachable (390: 165x44 box) and advanced 0 to 3; lesson at 390 Next frame reachable, no horizontal scroll | Passed: same |
| 11 | Console / page errors | Passed (none) | Passed (none) |

## Counts
Passed 22 cells, Failed 0, Blocked 0, Skipped 0.

## Observations (not failures)
1. Trace starts at "Korak 0 od N"; MT lesson step 1 enters at trace step 15, MP final lesson step 8 resets the trace to 0.
2. SL grammar in MT end text: "Kos 2 ima 4 oglišč in dobi 2 trikotnikov." (count-agreement forms); worth a localization look.
3. The lesson scene uses its own polygon: an edited P4.x (11) is replaced by 12 in the lesson and restored on exit.
4. Whole-svg innerHTML hash after exit differs from entry although input values and node counts match (random jsxgraph ids).
5. Slovenian refusals refer to vertices as v2 while the board labels are P2.
6. Cannot attribute leftover chrome-headless-shell processes (other workers run smoke concurrently); my scripts all exited; the first aborted a.mjs hit its own 170 s deadline and was replaced by a1/a2.
