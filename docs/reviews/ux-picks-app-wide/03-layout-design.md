# Task 03: the layout function (handler design)

Task 03 slice 1 ([task](../../tasks/ux-picks-app-wide/03-layout-and-board-cards.md)). The handler owns this design. Workers implement and test it; a change to the types or the rules below goes back to the handler.

The prototype's facts come from `git show aff6df6c:src/uxPicks/dock/*` (summary from 2026-11-22). What the rebuild changes:

- **No layout after paint.** The prototype opened cards, painted, then folded them 120 ms later. It cut rows and snapped them on a 250 ms interval, and Odčitki folded one group per pass starting at 700 ms. Here one pure call returns every final rectangle, fold and cut before the first paint.
- **One store for placement.** The prototype kept free positions and folds under separate localStorage keys, with conflicting scope. Here one versioned record holds them (slice 4).
- **Integer order.** Drop order was the fractional midpoint of the two neighbours, which is unbounded. Here a drop renumbers the stack as integers.

## Module

Path: `src/workspace/layout/boardLayout.ts`. It has no React, JSXGraph or DOM imports, and unit tests run without a DOM. The entry point:

```ts
export function layoutBoard(input: LayoutInput): LayoutResult;
```

`layoutBoard` is deterministic: the same input gives the same output. The presenter calls it in `useLayoutEffect` or a pre-paint measure pass, and animates each card between its previous and next rectangle as one interruptible glide.

## Types

```ts
type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bc' | 'br';   // centre floats; bottom left is the pucks strip
interface Size { w: number; h: number }
interface Rect { x: number; y: number; w: number; h: number }

interface CardInput {
  id: string;                 // 'readouts' | 'legend' | 'lesson' | 'tools' | `section:${string}`
  natural: Size;              // from the hidden measure pass (slice 1a), open, unconstrained height
  min: Size;                  // head plus the first row (or 100 px of height), at the card's natural width
  foldedHeight: number;       // head only
  rowBreaks: readonly number[]; // cumulative heights (from the card top) where a cut may fall; ascending
  priority: number;           // lower folds first; lesson = Infinity (never folds)
  defaultAnchor: Anchor;
  defaultOrder: number;
}

type Placement =
  | { kind: 'docked'; anchor: Anchor; order: number }
  | { kind: 'free'; x: number; y: number };     // board coordinates, top-left of the card

interface LayoutInput {
  board: Size;
  cards: readonly CardInput[];
  stored: Readonly<Record<string, Placement>>;  // learner's placements; absent = default
  storedFolds: Readonly<Record<string, boolean>>; // learner's explicit folds (true = folded)
  frame?: { open: readonly string[]; usesTools: boolean }; // lesson frame: cards it opens; tools when a used control is in Orodja
  pucks?: Size;               // natural size of the pucks strip; absent = no strip
  maxSpan: number;            // A10: default anchors sit in a centred band of this width (value chosen in the feel slice)
  columnMaxFraction: number;  // a side column's width cap as a fraction of the band (start 0.32)
  gap: number;                // spacing between and around cards (start 8)
  frozenFolds?: Readonly<Record<string, boolean>>; // during a drag: the folds to keep (no re-plan)
}

interface CardLayout { id: string; rect: Rect; folded: boolean; cut: number | null; anchor: Anchor | 'free' }
interface LayoutResult {
  cards: readonly CardLayout[];
  pucks: Rect | null;
  free: Rect;                 // the largest empty rectangle not covered by docked cards or the strip (the plot's clear area)
  band: { x: number; w: number };
}
```

## Rules, in order

1. **Band.** `band.w = min(board.w, maxSpan)`, centred. Cards placed by default anchor to the band's edges. A stored docked placement anchors to the board's edges. A learner who docked a card at a far edge keeps it there (spec acceptance 4a); defaults stay within the span.
2. **Pucks strip.** If `pucks` is given, it goes in the bottom left of the band: `x = band.x + gap`, `y = board.h - pucks.h - gap`. It reserves height only where it sits: the left column loses the strip's height plus a gap at the bottom; the centre and right columns keep the full height. When the left column cannot fit above the strip even at every card's smallest cut (`min.h`), the first of these that holds is used, in order: (a) the strip under the column, across the centre, as above; (b) the strip right of the left column (`x = left.x + left.w + gap`) with the column at full height, but only if the strip's height wrapped in the width that leaves (`wrappedStripHeight(slots, w)`, slots from `puckSlots`, default one slot) fits `board.h - 2·gap`; (c) the strip stays at the bottom at full width and the left column is cut to the room above it, a docked card down to its `anchorMin` sliver (kept nav/controls row, pinned rows, "Več" bar; its body scrolls behind "Več"), after the usual folds (lowest priority first, never the last open card); (d) as (b) with the slivers. If none fits (for example 1024x768, phase-portrait-linearization step 2+: sliver 288 + strip 226 + gaps > 445), the layout is (c) and then: (f) the strip's horizontal extent is limited only by cards that occupy its vertical band: it runs from the left column's right edge (+ gap) under right-column and centre cards whose bottom edge is above the strip's top (for example folded heads), to the nearest obstacle in its band or the band's right edge, its wrapped height recomputed for that width until stable, and is used if it fits and overlaps no card; (g) otherwise the lowest-priority open right-column card is folded (never pinned, never the column's last open card) and (f) is retried. Nothing is cut below the sliver, so the nav row stays reachable; only if (f)/(g) fail does the strip cover the sliver's body. Its width is `min(pucks.w, L - strip.x - gap)`, where `L` is the left edge of the bottom-centre stack when there is a `bc` card (or any centre card reaching the strip's rows), otherwise the left edge of the right column (the band's edge if there is none). It never overlaps `bc` or `br`.
3. **Stacks.** Docked cards are grouped by anchor and sorted by `order`, then `id`. Columns hold anchors as follows:

   | Column | Anchors | Width | Bottom limit |
   | --- | --- | --- | --- |
   | left | `tl`, `ml` | its widest open card, at most `columnMaxFraction · band.w` | the strip's top, when there is a strip |
   | centre | `tc` at the top, `bc` at the bottom | its widest card | — |
   | right | `tr`, `mr`, `br` | its widest open card, at most `columnMaxFraction · band.w` | — |

   `tc` and `bc` grow away from their edge. `ml` and `mr` start below the `tl` and `tr` stacks. `br` and `bc` stack upwards from the bottom.

   - **Centre width:** `max(0, min(widest card, band.w - leftW - rightW - 4·gap))`; side columns keep their caps. Every card takes its column's width, so the presenter measures a card's height at that width. The centre column is centred on the board, pushed aside when unequal side columns would touch it.
   - **Column edge:** a column anchors to the board edge if any of its cards has a stored docked placement, otherwise to the band.
   - **Stack order:** order 0 sits nearest the anchor's edge (`tl`, `tc`, `tr` stack down; `bc`, `br` stack up); `ml` and `mr` sit directly under the top stack.
   - **Widths:** a column's width counts open cards only, unless none is open.
   - **Cut order:** tallest open card first; each cut uses the room the other cards leave; a cut that would not shrink the card is skipped.
   - **Free clamp:** x in `[0, board.w - w]`, y in `[0, board.h - foldedHeight]`.
4. **Open or folded**, per card:
   - If `frozenFolds` is given, its value wins.
   - Otherwise the frame wins: a card in `frame.open` is open, and so is `tools` when `frame.usesTools`.
   - Otherwise the stored fold.
   - Otherwise open.
5. **Fold before clip.** A column's last open card is never folded (it is cut instead, rule 6). When a column's open cards need more height than it has, the lowest-priority card is folded. Frame-opened cards, the lesson card and stored-open cards are never folded. This repeats until the column fits or nothing foldable is left. Skip this step when `frozenFolds` is given (a drag never re-plans folds).
   **5b (owner, 2026-11-26: Legenda starts open where it fits).** A card with `reopenWhenRoom` (Legenda) that this step folded is opened again when the folds after it left its column room for it: as the lowest priority it folds first, often before a higher-priority card that then had to fold anyway.
6. **Cut.** If a column still does not fit, the tallest open card is cut. The cut height is the largest `rowBreaks` value at or below the available height, never below `min.h`. A cut card scrolls inside itself, behind the overflow bar of slice 2.
7. **Free cards** keep their stored `x, y`, clamped so the head stays inside the board. They do not take part in stacks and may overlap cards (the owner's drag rules). **Anchor rule (handler, 2026-11-23):** the learner's top edge stays put when the card's height changes. A free card taller than the room under its top is cut (rule 6 cut, body scrolls behind "Več") instead of moving up. The y clamp keeps only a frame-independent sliver on the board: `CardInput.anchorMin` (the lesson's controls row, pinned rows and bar; measured from `data-card-keep`), else head + bar + 50 px of body, never above `min.h`; the cut may go below `min.h` down to that sliver. A card that no longer fits even at the sliver, or after a board resize, still moves up.
   - **Strip dock (2j-2l, 2026-11-24; `LayoutInput.stripDock`, stored as `StoredBoardLayout.strip`, default `bottom-left` = rules 2a-2i above).** The strip never folds, is never cut and never floats.
   - **2j bottom-centre / bottom-right:** the strip is the bottom member of the centre or right stack, but not capped at that column's width: it runs from the column's anchored edge (right: the band's right edge; centre: centred on the column) towards its natural width, bounded by the left column's right edge + `gap` (and, for centre, the right column's left edge - `gap`; for right, by a centre card that reaches the strip's rows: the strip then starts right of it), and wraps only when that width is too narrow. Its height is `wrappedStripHeight(slots, width)`. The column's cards keep their own width and stack upwards above the strip; rules 5 and 6 see that height as fixed; the left column keeps the full height. When the stack still reaches into the strip after every cut, its last open card folds too, then learner-opened cards (as 2h/2i; never the lesson card). The strip is never placed with `y < gap`: when its wrapped height exceeds `board.h - 2·gap` at that dock, the frame uses the bottom-left rules (stored dock unchanged). The grip is the strip's first slot (`puckSlots[0]`), so every dock reserves it.
   - **2k left / right:** the strip is its own column at that board edge: slots stacked top-down from `gap` (8 px between), wrapped column-major into more columns when taller than `board.h - 2·gap`; each column as wide as the widest slot. The cards are laid out in the board minus `strip.w + gap` on that side, so their column starts at the strip's inner edge + `gap` (mirrored for `right`). Free cards keep their stored x relative to the board.
   - **2l:** the strip's rect is an obstacle for `free` in every dock.
8. **Free rectangle.** The largest axis-aligned rectangle inside the board that avoids every docked card and the strip. Ties go to the one closest to the board centre. Task 07's view fit reads it.

## Drag (pure helpers in the same module)

- `dropTarget(input, cardId, pointer): {anchor, index} | 'free'`. The edge band is `0.28 · min(board.w, board.h)`, as on the prototype. Outside it the card floats. Inside it, the nearest anchor point wins, and the index comes from the settled centres of the target stack.
- `stripDropTarget(board, stripRect): StripDock`. The dragged strip's centre picks the nearest of five points in board-relative terms: bottom-left (0, 1), bottom-centre (0.5, 1), bottom-right (1, 1), left (0, 0.5), right (1, 0.5). Never free.
- `applyDrop(stored, cardId, target): stored'`. Renumbers the target stack as integers.

A layout during a drag is `layoutBoard({...input, stored: applyDrop(...), frozenFolds: previous folds})`. Only the cards whose rectangles change glide.

## Tests (no DOM)

- Per anchor: default places are inside the band at 3440×1440.
- A stored far-edge placement stays at the board edge.
- Fold order follows priority; frame-opened cards never fold; `frozenFolds` stops all re-planning.
- Cuts land on row breaks and are never below `min.h`.
- The strip never overlaps `bc` or `br`.
- The free rectangle is correct on hand-computed boards.
- Determinism: the same input gives the same output.
- Property test over random inputs: no two docked cards overlap; every docked card is inside the board.

## Task 04 additions

`reserve`, `defaultFolded`, `budget` and `expanded`, as decided in [04-design.md, section 9](04-design.md#9-handler-decisions-2026-11-23). Rule 4 order: frozen → frame → stored fold → budget → `defaultFolded` → open.
`expanded`: the expanded card is exempt from cuts, and only lower-priority open cards of its column fold for it; as a last resort, when every other card is folded or at `min.h`, the expanded card is cut too (it never leaves the board). A budgeted card ignores its own `defaultFolded`.
