# F6 S3 smoke: /compgeo/fortune (commit 1a16beb2)

- Target: http://127.0.0.1:4323/bezeg-2.0/compgeo/fortune (handler-run production preview, commit 1a16beb2, dirty with untracked logs only)
- Browser: Playwright Chromium headless, 1280x720 (check 10: 390x844). Scripts, JSON and PNGs: `f6-s3-smoke/`.

| # | Check | SL | EN |
|---|-------|----|----|
| 1 | Deep link and reload | Passed: "Korak 1 od 8", queue "▸ mesto A / naslednji dogodek, B, C, D"; reload identical | Passed: "Step 1 of 8", "▸ site A / next event"; reload identical |
| 2 | Trace controls | Passed: Next 1->8, Next disabled at 8; Play ran to 8 of 8 and stopped (button back to "Predvajaj"); Reset -> 1 of 8 | Passed: same; Pause at step 4 held for 2.5 s; Reset -> 1 of 8 |
| 3 | C-7 current event | Passed: steps 2-7 show "Trenutni dogodek (pravkar obdelan)" with "● mesto A/B/C/D", "● krožni dogodek (B, A, D)", "(D, A, C)"; none at step 1 or 8 | Passed: "Current event (just processed)" with "● site A..D", "● circle event (B, A, D)/(D, A, C)"; none at step 1 or 8 |
| 4 | Free exploration | Passed: drag D (0,-3)->(1,-2) kept step 5 of 8; added 8 sites -> 12, trace "Korak 5 od 29" (step kept); 13th refused "Doseženo je največje število točk (12). Odstrani točko, preden dodaš novo."; end 25 of 29 (Next disabled at 29), Reset -> 1 of 29 | Passed: same values; 13th text in EN shown ("Points: 12 of at most 12"); step 5 of 29 kept |
| 5 | Degenerate inputs | Partly: collinear = parallel lines, "Oglišča: 0 od 0", step 6 of 6, no separate note text found; cocircular = "Oglišča: 1 od 1", 7 of 7; D moved onto B (input and drag) is NOT refused, see Observations | Partly: same; coincide text "Sites B and D coincide; move one of them." |
| 6 | Keyboard | Passed: Tab reaches skip-free chain incl. board (div tabindex 0, label "Točke na mreži. Izbrano točko premakneš s puščičnimi tipkami...") and Next step; Enter 1->2, Space 2->3; focus outline solid 3px; select P4 + 3x Right + Up moved D (0,-3)->(3,-2) | Passed: same (step 1->2->3; D -> (3,-2)) |
| 7 | SVG/PNG export, step 6 of 8 | Passed: izvoz.svg 39783 B (18 paths), izvoz.png 61263 B, signature 89504e470d0a1a0a | Passed: export.svg 39783 B, export.png 61263 B, PNG signature OK |
| 8 | SL lesson walk (?learn=1) | Passed: 17 frames (Next frame x16) to "Korak 7 od 7 / Okvir 3 od 3", Next frame gone at the end; "Nazaj v poglavje" -> /learn/sweep-algorithms#fortune; 0 errors | n/a |
| 9 | EN lesson walk + live switch | n/a | Passed: 17 frames, end 7/7 frame 3/3, "Return to chapter" -> /learn/sweep-algorithms#fortune. Switch to SL at step 2 frame 2 of 2 kept step and frame ("Okvir 2 od 2"), back to EN restored; 0 errors |
| 10 | 390x844 | Passed: route and lesson scrollWidth 390 == clientWidth 390, also after stepping to end; Next step (166 px) and Next frame (158 px) visible and clickable | Passed: same values |
| 11 | Console/page errors | Passed: none in any run | Passed: none in any run |

Counts: 11 checks: 10 Passed, 1 Partly (check 5), 0 Failed, 0 Blocked.

## C-7 visual description
- Site step (EN, step 2 of 8, `f6-s3-smoke/c3-en-site-step2.png`): horizontal sweep line at y=5 through A, and a thick ring (outer ring plus white inner dot) on site A; no beach-line arcs yet.
- Circle step (SL, step 6 of 8, `c3-sl-circle-step6.png`): thick solid orange circle through B, A, D (executed), thinner circle for the other scheduled one, dashed cancelled circle, parabola arcs and blue edge rays; a ring around the new vertex near (-0.5,1); diamond at the circle bottom. Last step and step 1: no ring, no side item.

## Observations (not failures)
- Spec expectation "a site moved onto another is refused" differs: dragging D onto B, or typing B's coordinates, is accepted; the trace area empties and shows "Mesti B in D sta enaki; premakni eno od njiju." / "Sites B and D coincide; move one of them." (the step readout disappears). Adding a duplicate point by input gave the same state ("Mesti E in F sta enaki..."). Handler to decide if this is the intended "refusal".
- Collinear example: no explicit note sentence found in page text (checked body text, aria-live regions); only parallel lines and "0 od 0" vertices. If a note is required it is missing or I missed it.
- Cocircular: vertex count 1 of 1 only; "degree 4" not stated in text (not checked visually in the board).
- Right after adding sites, one aria-live region still read "Korak 5 od 8. ..." for 250-400 ms while the visible readout said 5 of 29 (unconfirmed; may be timing).
- Step readout and event list sit below the fold at 1280x720 (graph fills the first screen).
- Lesson counter is 7 lesson steps, separate from the trace's 8 steps.

## Not exercised
- Touch input; presentation mode; presets; 12 random sites button; cocircular board visual; Pause-at-end timing beyond about 3 s.
