# Task 11 interactive states (script `states.cjs`)

Run (repo root, worktree cwd):
- BEFORE (frozen build :4493): `node docs/reviews/ux-picks-app-wide/feel/11/states.cjs --base http://127.0.0.1:4493/bezeg-2.0 --out .command-logs/shots/11/states-before`
- AFTER (dev :4491): same with `--base http://127.0.0.1:4491/bezeg-2.0 --out .command-logs/shots/11/states-after`
- `--only <substring>` runs matching states; exit code non-zero if any FAIL. Fresh page per state; 2.5 s settle after load.
- Before run: 35 PNGs, 0 FAIL. Dev server smoke (`--only strip-default`) ok. Sheets: `states-before-{1..6}.png` (1 cards, 2 lesson/section/tools, 3 pucks, 4 strips + touch, 5 board drag/column/touch, 6 presentation). Raw PNGs in `.command-logs/shots/11/states-before/`.
- Sheet composer: `.command-logs/compose.cjs` (reuses `sheetHtml`/`sheetLayout` from `scripts/shot.cjs`, uncommitted scratch).

| state | route | shows |
|---|---|---|
| card-readouts | analysis/taylor | readouts card |
| card-legend-open | same | legend unfolded |
| card-tools-edit / -display / -save | same | tools card, 1st/2nd/3rd head button |
| card-head-hover / -focus | same | readouts head (60 px), fold hovered / grip focus-visible |
| card-drag | same | whole board, readouts card held mid-drag |
| card-lesson | lesson example | lesson card step 1 |
| card-readouts-highlight, card-lesson-later | same | after 2 "Naprej" clicks a `[data-highlight]` row exists (Absolutna napaka); lesson card at that step |
| card-readouts-cut | analysis/phase-portrait | cut readouts ("Vec vsebine") |
| card-section-open | functions/transformations | "Vrstni red operacij" section card unfolded |
| card-tools-empty | functions/exponential | tools card, empty body |
| card-notes-more | compgeo/polygon-area | readouts; `.ws-more` was absent or clicked (small 187x114 card, no more-bar seen) |
| card-tools-inspector | bezier/decasteljau | tools open (Konstrukcija) |
| board-presentation, -tools | analysis/taylor | viewport 1440x900, Presentation on (button "Predstavitveni nacin"); then tools opened |
| strip-default | analysis/taylor | strip +8 |
| puck-hover / -focus / -help-open | same | centre puck: tooltip / focus ring / help button clicked (+110 top) |
| puck-entry, puck-entry-invalid | same | typed entry open; then 99 + Enter (red border) |
| puck-drag-ruler | same | ruler visible while held (value 0,65) |
| puck-undo | same | after click at 85 % of track (value 1,4) |
| puck-sweep | same | sweep running (dark sweep button), stopped after |
| count-hover | same | degree puck "+" hovered |
| strip-phase / -decasteljau / -inverse / -transformations | their routes | strip +8 |
| strip-column | analysis/taylor | stored layout `{version:1, strip:'left'}` in key `board-layout` |
| touch-board / -readouts / -strip | analysis/taylor | 1280x800 `hasTouch:true`; `(pointer: coarse)` was true with just those options (no extra needed) |

## Workarounds / caveats
- Focus-visible: `el.focus({focusVisible:true})` plus a Shift keypress; rings show in the sheets.
- Presentation button found by role+name "Predstavitveni nacin" (Slovenian only; AFTER must keep that label or edit the script).
- puck-undo: the undo pill overlaps the tooltip text in the crop (visible in the before set); the 1 s window is met (300 ms).
- puck-entry-invalid: the +60 bottom crop pulls in the board toolbar below the strip; it also shows the red invalid border only (no message text seen).
- Assumed selectors: `.tools-head-button`, `.puck-help-button`, `.puck-sweep`, `.puck-step`, `[data-puck-ruler]` all matched.

## Visibly broken in BEFORE
- Presentation: pucks' labels and values are near-invisible (pale text on cream); tools card opens over the legend/readouts stack; fold bars crowd the right column.
- Phase-portrait strip: puck labels truncated, strip overlaps graph text; transformations pucks truncated.
- Readouts-cut: text runs past the card right edge ("Trajektorije se ustav").
- Lesson card body cut at "Vec vsebine"; tools-empty card has an empty body bar.
- Touch: strip shows tiny dim "." chips beside the "?" buttons.
