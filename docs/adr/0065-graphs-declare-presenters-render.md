# Graphs declare their parameters and readouts; presenters per form factor render them

Accepted on 2026-11-22 (owner, 2026-11-22: "We don't really want automatic designations for readouts or text, the graphs themselves can decide that", "the pucks etc should be selected by the graph and not guessed"; planning session: phones may get completely redesigned controls, and the implementation must let phones inject their own).

## Context

Today a graph renders its own controls, readout and legend as React markup inside the tools column. The prototype first tried to detect that markup from outside (DOM scans for sliders, captions and legends), which was unreliable, and then moved to an explicit `GraphUx` declaration per graph. That declaration still pointed at rendered controls by a string key, had ids checked only by eye, and every graph gated it on a flag. On phones the desktop arrangement was squeezed into one column and was hard to use: a tap-catcher blocked the pucks, the lesson showed a line and a half of text, and scrubbing was coarse.

## Decision

- A graph declares, as a pure function of its scene state: its parameters (key, kind, range, step, format, label, help), formula, readout rows, legend entries, section cards, main-action card and the content marks the view keeps visible. Ids are typed per graph, so a lesson frame naming a row or card is type checked.
- A parameter is declared once. The tools control, the puck, the preview and any phone control are renderings of that declaration and write through the store of [ADR 0064](0064-source-tagged-scene-writes.md).
- A legend entry takes colour and visibility from the drawn object it names.
- Presenters consume only the declaration and the store. The desktop presenter renders board cards and the pucks strip ([ADR 0063](0063-cards-on-the-board.md)). The phone presenter is designed separately and may use different controls, card arrangement and lesson layout.
- Nothing is inferred from the DOM or from lesson prose.

## Alternatives

- **Detect controls and board text generically.** No per-graph work. Rejected after the prototype: the detection captured stray corner text, missed counts and shared inputs, and the owner asked for graphs to decide.
- **Keep per-graph markup and add a key to each control** (the prototype's `paramKey`). Less change per graph. Rejected: shared inputs lacked the key and got local wrappers, the puck had to read range and format back from a rendered control, and a phone could not replace the control.
- **One responsive presenter for all sizes.** Less code. Rejected by the owner: phones need controls designed for them, not a narrower desktop.

## Consequences

- Every graph is converted once (116 classes). The declaration is the only path for a converted graph, with no flag, which removes the double UI that slowed the prototype's conversions.
- A contract test can run every lesson scene against its graph's declaration and fail on a highlighted row the scene hides or an id that does not exist.
- The phone design needs its own spec and owner review before it is built.
- Controls that are not a range or a count are placed with taste, graph by graph (owner, 2026-11-22: "some do make sense as standalones/pucks"). The contract has `choice` and `toggle` kinds and a per-parameter placement (board or Orodja); large or setup controls such as point lists and function entry stay in Orodja. The pilots and the conversion guide give the examples converters follow.
