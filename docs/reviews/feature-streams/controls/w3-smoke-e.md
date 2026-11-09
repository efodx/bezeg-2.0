# Wave 3 smoke E (O1 operation panel, R1f readouts)

Preview: production build fc9680af at http://localhost:4327/bezeg-2.0/, Chromium 1280x800; 390x844 with touch for two routes per group. Scripts and screenshots: `.command-logs/w3-smoke-e/` (o*.cjs, g*.cjs, o-*.png, g-*.png). Language switch via `#bezeg-language`.

## Failures
1. Delaunay live text changes during a drag. `/compgeo/delaunay`: observe `[data-delaunay-live]`, drag P2 with ~12 pointer moves 40 ms apart, mouse still down. Expected: no change until pointer up. Observed: "Korak 1 od 5..." became "Korak 1 od 3..." at move 6 (before `mouseup`). Other graphs (Inversion, Inscribed angle, Notable) changed only after pointer up.
2. Unavailable Apply / Reset weight reason is not visible text. `/bezier/subdivision`: press Subdiviziraj 5 times, focus it, press Enter. Reason ("Na voljo je največ 5 korakov...") is only in `title` and the hidden `aria-describedby` node; no visible text appears (no `onBlockedPress` passed by `OperationTool`). Same for `/rational/base` Ponastavi utež with weight 1 (title "Ta utež je že 1." only). Brief expects the reason shown on press.
3. Apply buttons at 390x844 touch (`(pointer: coarse)` true) are 34 px high, below 44: `/bezier/extrapolation` Ekstrapoliraj, `/bezier/elevation`, `/bezier/subdivision`, `/rational/rational-elevation` (graph-command Apply, `btn btn-primary`). Workspace `/bezier/curve` Edit tab buttons, Preview and slider are 44 px.
4. Visible block with live semantics: `p.point-collection-count` ("Točk: 4 od največ 40") has `role=status` and is visible on every compgeo/plane-geometry route; the hint `<p aria-live=polite>` (e.g. "Premakni oglišča trikotnika...") is visible too. Brief says visible readout blocks carry none.

## Observations (not failures)
- More than one `[data-readout-live]` per route: Delaunay 3 (delaunay, triangulation, generic empty), monotone routes 2 (second reads "Večkotnik je enostaven."), others 2 (graph live + empty generic from the point editor).
- `/rational/base`, select Krivulja1: Ponastavi utež was `aria-disabled=false` on first render with weight 1, became disabled after the first press (no-op).
- Workspace: after Apply on Dvigni stopnjo all disclosures were closed (re-mounted); elevation never becomes unavailable (40 applies).
- 390 px: inspector checkboxes (`input`) measure 18 px (likely label is the target; not checked).
- `/compgeo/point-set-triangulation`: no live text or step counter on load (`[data-triangulation-live]` empty); not exercised further.

## Results (P pass, F fail, - not covered)
Group O (checks 1 load/no console errors, 2 behaviour, 3 reason, 4 keyboard, 5 language)

| Route | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| /bezier/curve workspace (Edit, Krivulja1) | P | P: Preview pressed, one at a time (nodes 112/113/114/114/121); Shrink slider ArrowLeft changed preview; closing Skrči cleared preview, reopened aria-pressed=false; Apply elevate cleared preview, degree 3 to 4 | - (no unavailable state) | P: Space on Preview toggled | - |
| /bezier/extrapolation, /elevation, /subdivision, /subdivision-2 | P | P: Apply present, no Preview (permanent) | F (2) on subdivision at 5 steps; other routes - | - | - |
| /rational/rational-extrapolation, -elevation, -subdivision | P | - Apply not clicked | - | - | - |
| /rational/base Reset weight | P | - | F (2) | P: Enter reaches blocked press | - |
| 390 touch: workspace | P | P tap Preview | - | - | - |
| 390 touch: operation routes | P no overflow | - | - | - | F (3) |

Group G (1 load, 2 step counters/chips/live, 3 end reason, 4 keyboard, 5 language SL-EN-SL)

| Route | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| /compgeo/delaunay | P | counter 1-based "Korak 1 od 5", steps 1>2>3 of 3 after edit; F (1) mid-drag update | P "Ni več korakov." in title and visible help | P Space/Enter on Next, focus ring 3px solid | P relabels "Step 1 of 5", restored |
| /compgeo/point-set-triangulation | P | - live empty | - | - | P (no text) |
| /compgeo/monotone-triangulation | P | P "Korak 1 od 44" | - | - | P |
| /compgeo/voronoi | P | live present; drag of sites not seen to change first 50 chars | - | - | P |
| /compgeo/monotone-partition | P | P "Korak 1 od 15" | - | - | P |
| /euler-line, /triangle-centres, /simson-line | P | P live present; Notable changed after drag only (acute to obtuse text unchanged on acute drag); Euler/Simson text constant | - | - | P |
| /inversion, /inscribed-angle | P | P live changed once after pointer up (3 positions inversion; 45 degrees inscribed) | - | - | P (value kept) |
| 390 touch: delaunay, inscribed-angle | P no overflow, Next tap works | P | - | - | - |

## Coverage gaps
Keyboard checks only on Delaunay and workspace Preview; no arrow-key point moves; rational operation Apply not clicked; Voronoi and point-set-triangulation interaction minimal; no screenshots opened beyond measurement; Notable points obtuse transition untested.
