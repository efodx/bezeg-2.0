# F3 isometries Batch C, slice 1 (rosette and frieze scene actions, opening probe)

## Written
- `src/learning/model.ts`: `set-rosette` (`n?`, `mirrors?`, `point?`) and `set-frieze` (`features?: Partial<{vertical, horizontal, halfTurn, glide}>`, `period?`) in the `isometry` union, with comment.
- `src/graphs/isometry/IsometryGraph.tsx` `applyIsometryAction`: two new cases, validated completely before one `setState`; unchanged values write nothing; the mode is never changed. Messages start `isometry set-rosette: ` / `isometry set-frieze: `. An action naming no field (or `features: {}`) throws, as `set-dilation` does (brief did not say; flagged below).
- `IsometryLessonActions.host.test.tsx`: 5 new tests (action equals controls for both, only named fields written and unchanged writes nothing, synchronous sequence plus checkpoint restore, invalid payloads with message prefix and no change).
- Red: new operations routed to a never-matching case: 5 failed / 9 passed (`host-red.log`). Green: `host.log`, `s1-unit.log` (src/graphs/isometry src/isometry), `s1-tsc.log`, `s1-lint.log` all exit 0. Files LF.
- Temp probe test deleted.

## Observed (full text in `.command-logs/iso-c/probe.txt`, sl and en per opening)
- Default state: mode `mirrors`; rosette n 5, no mirrors, point (4,1); frieze halfTurn only, period 4. Entering frieze mode shows p2 at once.
- Rosette first frame (n 5, no mirrors): status "Rozeta ima 5 gibanj in 5 različnih slik točke." / "The rosette has 5 motions and 5 distinct images of the point."; rows Grupa=ciklična grupa C5, Red grupe=5, Število različnih slik=5, point, Slika 1, Slika 2 (computed). Captions slika 1..5, središče, točka lika. So the L4 step 1 answer (5) is stated on the first frame, in the status and two rows.
- Mirrors on, generic point: status "10 gibanj in 10 različnih slik", D5, order 10, captions slika 1..10, mirror lines drawn (1 curve), diamonds for reflected images. Orientation alternation is not stated in text; only marker shape (circle direct, diamond reflected) shows it.
- On a mirror (n 5, point (4,0)): "Točka leži na zrcalu: različnih slik je 5 od 10 gibanj." Centre (0,0): "Točka je središče rozete ... slika ena sama." Mirror lines for n 5 are at angles j*36 degrees; grid points within |x|,|y|<=8 on a mirror: only the x axis (y=0) (scan result in probe.txt, ON-MIRROR line; n=5 only was scanned).
- n=1,6,12: counts n, 2n (1/2, 6/12, 12/24) in status, grammar "1 gibanj" / "1 motions" is wrong for 1 (and "1 slik lika").
- Frieze, all 16 subsets, period 4 and 6, identical: none p1 (1); V p1m1 (2); H p11m (2); V+H p2mm (4); R p2 (2); V+R, H+R, V+H+R p2mm (4); G p11g (2); V+G p2mg (4); R+G p2mg (4); H+G, V+H+G, V+R+G, H+R+G, all four: reducesPeriod (status "Ta izbira zmanjša periodo ..."/"This choice shortens the period ...", type row "ne"/none, no type caption). Matches the spec table (1,2,2,2,2,4,4; p2mg from V+G or R+G; V+R gives p2mm). No disagreement.
- L5 step 1 (only half-turn): first frame states p2 and "2 slik lika" (status, rows, caption "tip friza p2"). L5 step 2 (V added to G): p2mg, 4 images in status, rows and caption. Both answers are visible before asked.
- Frieze rows: Tip friza, Slik lika v periodi, Perioda, then the four features da/ne. Captions: perioda N, lik, tip friza X.
- Board: all openings [-18.7, 18.8] x [-12.5, 12.5] in the JSDOM shim (600x400); the initial view is half-height 10 in a real browser. Rosette images lie within |x|,|y| about 7 for point (4,1); frieze captions sit within x 4. Frieze polygons: 36 polygons for period 4 V+H (p2mm) across the model's range; whether the whole range is on screen was not checked in a browser.
- Reset (from rosette or frieze mode): returns the full default state, mode `mirrors` (composite rotation, 53,13 degrees), not the rosette or frieze opening.
- NaN breaks: model level, `mergedPoly` of 36 polygons gives 431 points, exactly 35 NaN separators, 36 rings each closed on itself, so no segment can join two copies in the data. In the JSXGraph curve objects of the JSDOM board the points array carries the NaN as non-finite points (7 of 95, 26 of 323). JSDOM draws no SVG path (`d` attribute absent), so the drawn path itself is not confirmed; needs a real browser.

## Doubts
- Empty `set-rosette` / `set-frieze` throw (my choice, consistent with `set-dilation`); the brief said nothing.
- The drawn-captions list in the probe may include hidden-by-callback captions (e.g. 10 image captions at a mirror point); not trusted as a visibility check.
- Pluralisation "1 gibanj", "1 slik lika", "1 motions" at n=1 is an existing wording defect (outside this slice).
