# The lesson reading card docks beside the graph

Accepted on 2026-11-20 (owner instruction of the same day: decide the design and implement it; evidence in [the lesson bug crawl](../reviews/lesson-bug-crawl/triage.md), section 1, and [the stream's handoff note](../reviews/lesson-card-layout/handler-handoff-1.md)).

## Context

The Guided lesson reading card floated over the graph since [ADR 0003](0003-frame-based-graph-anchored-lesson-overlay.md). At 1440×900 it was 544 px wide, centred over a 1000 px board, and covered control points, legends and readouts that the step text names: about 75 % of the 2721 findings of the lesson crawl. In Presentation it covered the board's upper left, and on a phone it covered the whole board. While the card is read the tools column is inert and dimmed, so the screen showed 310 px of locked controls beside a board that the instructions hid.

## Decision

The card never sits on the board at its home position.

- **Two columns (701 px and wider).** While a lesson is open the tools column is `clamp(310px, 32.5%, 34rem)` wide (433 px at 1440×900, 544 px at 1920). While the card is read it takes that column, in the tools' place, as tall as its text and no taller than the part of the column that is in the window; the tools are hidden, not dimmed. Hiding the card brings the tools back in the same column and at the same width, so the board has one size for the whole lesson. After the last frame, when the tools are live again, the closing card sits above them in that column.
- **One column (700 px and narrower).** The card follows the graph in the page and is as long as its text. The locked pan and zoom rows are not shown while it is read, so the board and the card's title, progress and Next share the first screen.
- **Presentation.** The card keeps its column while it is shown, also when the tools are closed.
- **Dragging stays.** The heading row and grip still move the card anywhere in the window, and the closed tab still travels with it. A card that has been dragged away leaves the tools in view, dimmed, as before.
- **No view pan.** The half-card pan of default 2D scenes on wide boards is removed with the overlap it compensated.
- **Text fits the card.** The title wraps instead of being cut, the card says "Vodeni primer" when the page heading already carries the lesson title, and a display-formula row wider than the card is set smaller (not below 72 %) before it scrolls.

## Alternatives

- **Keep the overlay and frame every scene around it.** Fitting a scene into the board's uncovered part needs a 1.8 to 2.3 times smaller scale at 1440×900, and it fails whenever a frame's text is long, the card is moved or a graph draws a legend in a corner. It also has to be solved again for every graph with its own framing (surfaces, authored views).
- **A third column for the card.** At 1440×900 the board would shrink to about 600 px beside a card and a 310 px column of locked tools.
- **Give the card the tools column at 310 px, without widening it.** The board keeps all its width, but body text runs about 38 characters a line and most formula rows overflow.
- **Keep the tools visible under the card.** Controls would show through below a short card and be covered by a long one; a learner cannot use them either way.
- **Phone: a sticky board above a scrolling card.** It would keep the figure in view while long text scrolls. A grid item only sticks inside its own area, so this needs the phone workspace rebuilt as a flex column, with the tab and click-catcher layer re-anchored. Left for a later slice; the first screen already shows board and navigation together.

## Consequences

- The board is narrower during a lesson: 877 px instead of 1000 px at 1440×900, 637 px instead of 644 px at 1024×768, and 875 px instead of 1308 px in Presentation with closed tools. It is resized once when the lesson opens and once when it closes; JSXGraph keeps the scene centred and to scale.
- The tools cannot be seen while the card is read. A lesson that asks the learner to use a control already has to hide the card to unlock it.
- No routes, Presets or stored data change. The lesson runtime's hide, reopen, exit, focus and reading-position contracts are unchanged.
- `LessonGraphCapabilities.adjustGuidedLessonView` and `LessonSession.setGuidedLessonCardWidth` are removed.
