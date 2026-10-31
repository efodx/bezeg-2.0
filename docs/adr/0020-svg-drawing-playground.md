# Plain SVG for the Bézier drawing playground

Status: accepted, 2026-10-31 (owner). Source: [Bézier drawing playground](../specs/bezier-drawing-playground.md).

The Bézier chapter's drawing playground is drawn with plain SVG in one React component, not with JSXGraph. The decision covers this playground only. Every demonstration, lesson and patch view keeps JSXGraph ([ADR 0019](0019-jsxgraph-surface-view.md)).

## Context

The playground must feel like a drawing program's pen tool. If it feels clumsy, learners blame the curves. The JSXGraph curve workflow was built for analysis. It adds control points by raising one curve's degree, edits through modes after selecting a curve, shows axes, labels and selection boxes, and measured about 10 fps for phone point drags ([performance results](../bezier-performance-results.md)). The playground draws only cubic segments, and SVG's path `C` command draws those natively.

## Decision

- One `<path>` for the drawing, with the browser drawing the cubic segments. Circles and lines for anchors, handles and overlays. Pointer Events with pointer capture for input.
- The drawing model and its mathematics live outside React (`drawingModel.ts`). Overlays that need evaluation, De Casteljau and the single high-degree curve, use the `src/bezeg` kernel.
- No new dependency.

## Alternatives

- **JSXGraph with a custom pen interaction.** One renderer for the whole site, but it inherits the board's point model, update cost and analysis-oriented look, and still needs a new interaction layer. Its phone drag cost is already measured as too slow for drawing.
- **A canvas or vector library (Paper.js, Konva).** These give hit-testing and path editing, but they add a dependency and a migration evaluation, and they would draw the curve in a second way. More work than the few hundred lines of SVG this needs.
- **HTML canvas by hand.** Fast, but it needs our own redraw loop, hit-testing and accessibility layer. SVG elements are focusable and can be named, which makes the keyboard and screen-reader path cheaper.

## Consequences

- The site has a second, small drawing surface. Its look follows the shared graph style tokens. It does not share JSXGraph's figure export, and SVG download is a later item.
- We write our own hit-testing, dragging and keyboard handling for one path. The spec bounds this to one shape, with no zoom or pan.
- The guardrail to measure before replacing JSXGraph does not apply, because nothing is replaced. The spec still requires drag frame measurements against the JSXGraph baseline before release.
