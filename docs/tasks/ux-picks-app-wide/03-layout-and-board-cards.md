# 03 Layout function and board cards

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) requirements A4, A7; [ADR 0063](../../adr/0063-cards-on-the-board.md). Reference: `src/uxPicks/dock/` (`dockLayout.ts`, `dockMeasure.ts`, `dockBudget.ts`, `snapRows.ts`, `dockFlip.ts`, `DockCard.tsx`, `BoardDock.tsx`), `src/uxPicks/declare/ReadoutCard.tsx`, `docs/reviews/ux-picks/polish-findings.md`.

## Goal

Odčitki, Legenda and section cards render from the declaration as cards on the board, placed by one pure layout function that runs before paint.

## Slices

1. **Layout function** (handler-owned design): inputs are the board size, the cards with measured natural size and minimum, stored placements and folds, the budget, the frame's opened cards and the controls the frame uses (spec A9), and the maximum span for default places (spec A10: on an ultrawide board the default anchors sit in a centred band; the independent review measured about 2,590 px between the lesson card and Odčitki at 3440×1440); outputs are each card's rectangle, fold and cut height, the pucks strip rectangle, and the free rectangle. Anchors as on the prototype: top left, top centre, top right, middle left, middle right, bottom centre, bottom right; centre area floats; bottom left is the pucks strip.
2. **Card shell:** head, grip, fold, reset, keyboard moves with announcements, drag rules the owner settled (pickup moves nothing; only cards a drop would move glide; outside all targets a card floats), touch dragging, opaque cards, overflow bar inside the card on a whole row.
3. **Odčitki, Legenda, section cards** from the declaration: labelled formula row, groups, `valueTex`, legend-linked swatches, later groups folding before the card scrolls, first note shown and the rest behind "Opombe (n)", a single-entry Legenda hidden, highlighted rows from the lesson frame scrolled into view.
4. **Stored layout:** one versioned, validated global record; unreadable data falls back to defaults.
5. **Label halo** for board labels, as on the prototype.
6. **Docking feel** (owner, 2026-11-22: docking "could feel better/smoother"). With the behaviour in place, improve how a drag feels: pickup and drop motion, how cards make room, the target preview, snapping near an anchor, drag on touch, and the glide when a card folds or a neighbour resizes. The layout function returning final rectangles before paint is what makes this possible: every move can be one interruptible glide between two known rectangles. The owner's drag rules in slice 2 stay. Deliver a before/after frame sequence against the prototype and show the owner on a preview.

## Acceptance

- Spec acceptance 3 (unit tests without a DOM; frame sampling shows no intermediate size on open, fold and drop).
- Converted pilots show the same values as their present panels (parity test), and their old readout and legend are no longer rendered.
- Value cells do not change a card's width during a sweep of the tools slider (CLS under the probe threshold).
- Keyboard: a card can be moved to each anchor, folded and reset, with announcements.
- Presentation mode and a chapter activity page are checked with cards.
- Spec acceptance 4a at 3440×1440: default places within the maximum span, plot not smaller than at 1440×900, a card the learner moved to a far edge stays there. The span's value is chosen here and shown to the owner in the feel slice.
- Critique: at most two rounds; P1s fixed, P2s fixed or logged here.

## Known from the prototype, to settle here

Legenda defaults to bottom right as on the prototype, and a graph where that covers data is given a better default in its conversion pass (task 08); a tall Odčitki on dense graphs; Odčitki folding groups while another card is dragged (the layout must not re-plan folds during a drag).
