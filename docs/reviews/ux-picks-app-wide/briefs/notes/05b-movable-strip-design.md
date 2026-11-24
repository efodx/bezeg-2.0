# Movable pucks strip: design (handler 6, 2026-11-24)

Owner, 2026-11-24: the pucks strip moves as one unit by a grip, as a bottom row (left, centre or right) or as a left or right side column with the pucks stacked; its position is stored; built after task 07's director slice, before the 03-07 release. His reason: "I could put stuff next to them, but couldn't move them." So the strip behaves like a dockable card: cards make room for it and sit beside it wherever it is.

Layout rules today: `03-layout-design.md` rule 2 (2a-2i), code `src/workspace/layout/boardLayout.ts` (`layoutBoard`, strip at :127-335, `dropTarget` :383, `applyDrop` :424); stored layout `src/workspace/layout/storedLayout.ts`.

## Model

- A separate dock, not a card anchor: `type StripDock = 'bottom-left' | 'bottom-centre' | 'bottom-right' | 'left' | 'right'`. Stored as `StoredBoardLayout.strip?: StripDock` (additive: no version bump; an unknown value parses as absent). `LayoutInput.stripDock?: StripDock`, default `bottom-left`. Reset layout clears it.
- The strip never folds, is never cut and never floats. Its slots (`puckSlots`) keep their own shape in every dock; only how they wrap changes.

## Rules (rule 2 becomes 2 for `bottom-left` and 2j-2l for the others)

- **bottom-left:** rule 2a-2i unchanged (every current test stays as it is).
- **2j bottom-centre / bottom-right:** the strip is the member nearest the bottom edge of the `bc` or `br` stack, before every card of that stack, as a row: its width is the column's width (centre: `max(widest centre card, strip natural width)` within `band.w - leftW - rightW - 4·gap`; right: the right column's width cap, widened to the strip's natural width when the cap allows), its height `wrappedStripHeight(slots, width)`. The stack's cards stack upwards above it; the column's fold and cut rules (5, 6) see the strip's height as fixed. The left column keeps the full height.
- **2k left / right:** the strip is its own column at that board edge, outside the card column of that side: width = the widest slot, slots stacked top-down from `gap`, wrapped into a second (third...) column when their stacked height exceeds `board.h - 2·gap` (column-major). The side's card column moves inward beside it (its x starts at the strip's right edge + gap for `left`, mirrored for `right`) and keeps its width cap; the band shrinks by the strip's width on that side. If the remaining band leaves the centre column less than its min width, rule 5 folds as today.
- **2l ownership of the free rectangle:** the strip's rect is an obstacle in every dock (as today), so `free` and the director see it.

## Drag

- A grip at the strip's leading edge (row: left end; column: top end), the same pointer and keyboard drag mechanics as a card head (`CardShell` pickup, move, drop, cancel); the strip glides like a card.
- `stripDropTarget(board, stripRect)`: the dragged strip's centre picks the nearest of five points in board-relative terms: bottom-left (0, 1), bottom-centre (0.5, 1), bottom-right (1, 1), left (0, 0.5), right (1, 0.5). Never free; the top half picks the nearest of these too.
- During a drag the layout uses the candidate dock with `frozenFolds` (as a card drag), so cards make room live.
- Keyboard: the grip is a focusable button; Arrow keys move the candidate to the neighbouring dock along the ring left, bottom-left, bottom-centre, bottom-right, right; Enter or Space drops, Esc cancels. Accessible name and a short catalog string (new Slovenian term chosen per `docs/localization.md#choosing-new-terms`).

## Tests (no DOM, `boardLayout.test.ts`)

- Each dock at 1280x720 and 1920x1080 on the Taylor and phase-portrait pilots: the strip overlaps no card, lies inside the board, and the free rectangle excludes it.
- `bottom-left` reproduces every current strip test unchanged.
- 2j: the dock's cards sit above the strip; a stack too tall folds or cuts its cards, never the strip.
- 2k: the side column sits beside the strip; a strip taller than the board wraps into a second column.
- `stripDropTarget` picks each dock from its region; stored `strip` round-trips through `parseBoardLayout`, and junk parses as absent.
- Presenter: the grip drags the strip by pointer and keyboard; Esc restores; the stored dock survives a reload.
