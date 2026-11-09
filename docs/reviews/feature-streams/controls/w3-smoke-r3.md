# Wave 3 smoke recheck (repair 3)

Preview: production build of 2f0017c0 at http://localhost:4327/bezeg-2.0/, Chromium 1280x800 unless noted; 390x844 with touch emulation for item 2. Brief: `w3-smoke-r3-brief.md`. Scripts and screenshots: `.command-logs/w3-smoke-r3/` (r3a.cjs, rat7.cjs, r3b.cjs, r3c.cjs, vor2.cjs; outputs *.out).

## Results

| # | Item | Result |
|---|---|---|
| 1a | `/bezier/subdivision` reason on press | PASS |
| 1b | `/rational/base` Reset weight blocked and reason | PASS, with a note on the premise (see below) |
| 2 | 44 px Apply at 390x844 touch | FAIL (4 of 4 routes) |
| 3a | Delaunay live text settles after pointer up | PASS |
| 3b | Voronoi live text settles after pointer up | FAIL (site drag); query-point drag PASS |
| 4 | Point count role and status region | PASS on Delaunay; example-change not checked on point-set-triangulation (no example select) |

## Details

**1a.** `/bezier/subdivision`: Subdiviziraj became `aria-disabled="true"` after 5 presses. Focused it and pressed Enter: `[data-apply-reason]` shows "Na voljo je največ 5 korakov subdivizije. Ponastavite primer za nov začetek." (visible, one element). A second Enter left one element with the same text; the element is keyed per press, so the count check cannot distinguish a repeat from no change.

**1b.** `/rational/base`, select Krivulja1 (the Edit tab does not show Ponastavi utež until a curve is selected). First render: weight value 2, Ponastavi utež `aria-disabled="false"`, which is correct for weight 2. Pressing it set the weight to 1 and `aria-disabled="true"`. Mouse click on the disabled button and Enter both show `[data-reset-weight-reason]` "Ta utež je že 1." (one element). Povečaj utež (+) moved the weight to 1,25, `aria-disabled="false"`, reason removed. Not covered: a first render with weight exactly 1 (the brief premise); no default curve was found at weight 1.

**2.** At 390x844 touch (`pointer: coarse` true), the Apply button of the curve operation panel is 34 px high on all four routes: `/bezier/extrapolation` (Ekstrapoliraj), `/bezier/elevation` (Dvigni stopnjo), `/bezier/subdivision` (Subdiviziraj), `/rational/rational-elevation` (Dvigni stopnjo). Other buttons in the panel are 44 px (Strni, Krivulja1) or 52 px (Uredi, Prikaz, Shrani).

**3a.** `/compgeo/delaunay`: 12 pointer moves 40 ms apart with the button held. `[data-delaunay-live]` text stayed "Korak 1 od 5..." until mouse-up, then changed once to "Korak 1 od 3..." within 1.5 s.

**3b.** `/compgeo/voronoi`: query-point drag (the square at about (4, 2)) left `[data-voronoi-live]` unchanged during the drag and changed once after mouse-up, to "(25/4, 15/4). Najbližje mesto: P7". PASS.
Site drag (P6 moved by (-120, -150) in 12 moves, 40 ms apart): the text changed from "Najbližje mesto: P6" to "P7" during the drag, at move 9 (run 1 and run 3) or move 10 (run 2), before mouse-up, and did not change after mouse-up. Reproduced in 3 runs. FAIL.
Drags started on the first 14 ellipse/circle elements in the board produced no text change at all; these did not identify sites, so they were not used as evidence.

**4.** `/compgeo/delaunay`: `p.point-collection-count` has no `role` attribute ("Točk: 4 od največ 40"). Dodaj točko: `[data-point-collection-status]` = "Točk: 5 od največ 40". Changing the example select (`[id=":r0:"]`) cleared the status region to "" and the count returned to 4. PASS.
`/compgeo/point-set-triangulation`: role absent; Dodaj točko put "Točk: 8 od največ 40" into the status region. The route has no example select (only the edges select), so the example-change check was not run there. An earlier attempt selected the language select by mistake and is not evidence.

## Coverage gaps
- 1b: no first render at weight 1.
- 2: Apply only checked at 390 px for the four named routes; no tap activation checked.
- 3: one Delaunay drag run; Voronoi site drag reproduced 3 times, query drag once; no keyboard checks.
- 4: point-set-triangulation example change not applicable; language switch not rechecked.
- Screenshots taken (subdiv-reason.png, rational-base-reset-blocked.png, voronoi-query-moved.png, delaunay-example-change.png) but not opened.

## Handler triage (2026-11-09)

- Item 2 (34 px Apply): the `.operation-apply` rule loaded (in the built CSS) but lost on specificity to `.workspace-inspector .tools .btn` and `.demonstration-workspace button` (34 px). Fixed by matching those selectors in `BezierCurveControls.css`; browser recheck pending.
- Item 3b (Voronoi site drag announced before mouse-up): `SettledReadout.report` restarts its timer only when the text changes, so a nearest-site text that holds for 500 ms during a slow drag is announced once. This is the intended settled meaning; decision 66 now says so. Not a defect.
- Item 1b: first render of `/rational/base` has weight 2, so the weight-1 first-render case from smoke E was not reproducible; the tolerance compare stays as a harmless guard.
