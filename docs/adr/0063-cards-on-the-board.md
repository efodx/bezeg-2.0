# Tools, lesson, readouts and legend are cards on the board

Accepted on 2026-11-22 (owner decisions of 2026-11-21, "i only want it on the graph it makes more sense to me" and "global placement in general", confirmed in the planning session of 2026-11-22). Supersedes [ADR 0061](0061-lesson-card-docks-beside-the-graph.md) and the fixed 310 px inspector column in DESIGN.md.

## Context

ADR 0061 moved the Guided lesson card off the board because it covered what its text named. The tools sat in a fixed 310 px column, and readouts and legends were drawn on the board or in that column. On the prototype the owner compared three arrangements: side docks beside the graph, cards on the graph, and a mix. With cards that can be moved and folded, a view that fits content into the area free of cards, and a card budget, he preferred everything on the graph at full width.

## Decision

- The graph takes the full workspace width. Orodja, the Guided lesson, Odčitki, Legenda and a graph's section cards are cards on the board, on one shared card shell.
- A card can be docked at an edge anchor, floated, or folded to a chip. There are no docks beside the graph.
- A card's place and fold are stored once for the whole app, not per page.
- The first view opens a limited number of cards (two from 1200 px, one below) and folds before it clips. A learner's own fold or placement always wins over a default.
- The view director fits the graph's declared content into the board area free of cards, which answers the covering problem ADR 0061 solved by moving the card away.
- Pucks have their own strip at the bottom left; it is not a drop target for cards.

## Alternatives

- **Keep ADR 0061: lesson card and tools beside the graph.** Nothing ever covers the graph. Rejected by the owner after using both: the graph loses a third of its width at 1440 px and more at 1024 px, and the locked tools column beside a lesson was the original complaint.
- **Side docks plus board cards** (prototype step b168aed0). Lets a learner choose. Rejected by the owner: two kinds of place for one kind of card, and the grid template became fragile (lesson rules, activity pages).
- **Per-page placement.** Fits pages whose content sits in different corners. Rejected by the owner: a card should be where the learner left it on every graph; the director handles differing content.

## Consequences

- Cards cover part of the board. On the prototype the cover was 30-49 % at 1440 px and up to 59 % at 1024 px in lessons, against a 35 % target. The cover is measured and reported; the director keeps declared content out from under cards, so most of the covered area is empty board.
- Presentation mode and chapter activity pages need the same card layout checked; the prototype did not cover them fully.
- Phones do not use this layout as it is ([ADR 0065](0065-graphs-declare-presenters-render.md)).
- ADR 0061 is marked superseded and DESIGN.md is updated in the stage that lands the tools and lesson cards.
