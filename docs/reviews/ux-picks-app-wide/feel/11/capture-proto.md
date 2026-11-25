# Prototype capture (ux-picks @ aff6df6c), task 11

Run: `bash docs/reviews/ux-picks-app-wide/feel/11/capture-proto.sh` (server `http://127.0.0.1:4492/bezeg-2.0`, 1440x900, wait 3 s, about 6 min).
Raw PNGs: `.command-logs/shots/11/proto/{board-1440,cards/<kind>}/`; sheets here as `proto-board-1440-<n>.png` (1-2) and `proto-cards-<kind>-<n>.png`.

Picks: with no stored set all nine picks are on, but the script passes `?ux=b1,a1,a19,a3,a29,dockTools,toolsCard,viewDirector,boardText` so it does not depend on localStorage (just shot passes query strings fine). Guided lesson is `?learn=1`.

Selectors (checked on the rendered pages): board `.ux-board-frame`; cards `.ux-bcard-readout` (title ODCITKI), `.ux-bcard-legend` (LEGENDA), `.ux-bcard-tools` (ORODJA), `.ux-bcard-guide` (lesson card); puck strip `.ux-pucks`.

| Scene | Route | Cards / pucks seen |
|---|---|---|
| Taylor free | `analysis/taylor` | tools, readout (open); pucks c, x, n (counter) |
| Taylor guided | `analysis/taylor?learn=1` | guide card (top middle, has "Vec" fold), tools folded to head, readout; same 3 pucks |
| transformations | `functions/transformations` | tools, readout; pucks c d a b u; a "VRSTNI RED OPERACIJ" bar under tools |
| De Casteljau | `bezier/decasteljau` | tools, readout; puck t |
| linear map | `linear-map` | tools only (no readout; formula text stays on the graph); no pucks |
| phase portrait | `analysis/phase-portrait` | tools, readout (3 "SE N ODCITKOV" fold rows), folded legend bar; pucks Stevilo(counter), Povecava, t |
| exponential | `functions/exponential` | tools only; no pucks (a-slider is inside tools) |
| inverse | `functions/inverse` | tools, readout, folded legend; puck x0 |
| polygon area | `compgeo/polygon-area` | tools only |
| bezier curve | `bezier/curve` | tools only |

Gaps (FAIL lines are expected, they print and do not stop): readout card missing for linear-map, exponential, polygon-area, bezier/curve; legend crops exist only for phase-portrait and inverse (`proto-cards-legend-2.png`); guide card only on taylor learn=1; pucks missing on linear-map, exponential, polygon-area, bezier/curve. Prototype's tool cards are all open on load except the guided Taylor (folded) and folded legends (captured as heads only, board crop shows them). Guided lesson in the prototype has no example id on that route: `?learn=1` opens the first step, not a chosen one.
