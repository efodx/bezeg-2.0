# Task 11 capture: BEFORE baseline (2026-11-25, branch board-styling at 97321d4d4, dev server :4491)

Repeat for AFTER: `bash docs/reviews/ux-picks-app-wide/feel/11/capture.sh after` (repo root; `BASE=` overrides the server).
Raw PNGs: `.command-logs/shots/11/<set>/{board-1440,board-1280,cards/<kind>,w310/<kind>}/` (not committed).
Sheets: `before-board-1440-{1,2}.png`, `before-board-1280-{1,2}.png` (8 + 2 tiles), `before-cards-{1..8}.png`
(1 readouts, 2-3 legend, 4-5 tools, 6 lesson, 7-8 strip; the script prints this mapping), `before-w310-{1..5}.png`
(1 readouts, 2 legend, 3 tools, 4 lesson, 5 strip). Sheet tiles are downscaled; raw PNGs are 1:1.

## Scenes (all verified to render a graph on the board sheets)
| scene | route | cards on load (default fold) |
|---|---|---|
| Taylor free | analysis/taylor | Odcitki open, Orodja folded bar, Legenda folded |
| Taylor lesson | analysis/taylor?example=lesson.analysis.taylor.taylor | Lekcija open, Odcitki open, Orodja folded bar, Legenda folded |
| transformations | functions/transformations | Odcitki open, Orodja folded bar (right end clipped by board edge), Legenda folded; top-left unnamed card "Vrstni red operacij" (a puck) |
| De Casteljau | bezier/decasteljau | Orodja OPEN (Konstrukcija), Legenda folded; no readouts card |
| linear map | linear-map | Odcitki open, Orodja folded, Legenda folded |
| phase portrait | analysis/phase-portrait | Odcitki open (cut, "Vec vsebine"), Orodja folded, Legenda folded |
| exponential | functions/exponential | Odcitki open, Orodja open but empty body; no legend |
| function-inverse | functions/inverse | Odcitki open (cut), Orodja folded, Legenda folded |
| polygon-area | compgeo/polygon-area | Odcitki, Orodja, Legenda (seen only in cards sheets, not opened) |
| bezier | bezier/curve | Orodja, Legenda; no readouts card (not opened) |
Puck strip is present in all ten scenes.

## Selectors
- Board (graph + all cards + strip): `.workspace-board-stage` (DemonstrationWorkspace.tsx:306; holds `JGBox` and the `.board-cards-layer`).
- Cards: `#board-card-<id>` with id `readouts`, `legend`, `tools`, `lesson`. NOT `[data-card-id=...]`: the hidden measure
  copy of readouts/legend has the same `data-card-id` (no `id`), matches first, and is invisible, so the crop fails.
- Strip: `[data-puck-strip]`.

## Commands
The exact commands are in `capture.sh` (one `just shot` per set: A board-1440, board-1280; B per kind over all ten routes,
failing routes are scenes lacking that card; C at `--width 310 --height 900`). All use `--base $BASE --wait 2500 --sheet`.
Run result: 67 ok lines, 13 FAIL lines, all of them "card absent in that scene" (expected), none for board or strip crops.
Absent: readouts on bezier/decasteljau and bezier/curve; legend on functions/exponential; lesson on every route except the Taylor lesson.

## Inspector width (310)
Cards and strip DO render at a 310 px viewport (desktop layout is kept; no phone layout appears). Crops were taken with
height 900. Readouts crop is about 160 px wide in the tile (layout shrinks cards to the board width); tools/lesson/legend/strip
scenes used: tools exponential + taylor, legend taylor + phase portrait, lesson Taylor lesson, strip De Casteljau + Taylor,
readouts Taylor + transformations (decasteljau has none: FAIL).

## Gaps
- 310 px viewport: board is tiny, so cards are squeezed to fit, not the inspector panel they were designed for; judge from raw PNGs.
- Not opened: cards sheets 2-8 and w310 sheets 2-5, board-1440 sheet 2 (polygon-area, bezier/curve); not seen at 1:1.
- Not captured: hover, focus, highlight, drag, unfolded legend, folded readouts, tabs other than the default Orodja tab.
- Prototype (`aff6df6c`) equivalents are not captured.
- Dev server, not a production build; fonts/timing may differ slightly.

## Oddities seen (board sheets)
- Redundant fold title "Odcitki" under the card title in every readouts card (all scenes with readouts).
- Exponential: Orodja open, empty body. Legends: folded; titles not truncated at 1440 sheet.
- Transformations: folded Orodja bar clipped at the right (arrow strip cut by the board edge) at 1440 and 1280.
- Transformations 1280: legend bar overlaps the formula text bottom right; function-inverse 1280: the formula "P = (2;4)" collides with the Legenda bar.
- Phase portrait: puck labels truncated ("Matrika A: a (vrsti...", "Povecava oko..."); transformations pucks too ("Navpicna razten...", "Vodoravna razteg...").
- Taylor lesson: lesson body text is cut ("Vec vsebine" bar), the lesson card overlaps the strip's first puck area at 1280.
- Phase portrait 1440: readouts text runs past the right edge in a row ("x od -4 do 4 ... ustav").
