# Bringing the Shorts’ visual ideas into the graphs

## Purpose

Students watching the gravity race, the straightedge construction and the pizza-shop map could see what moved and why the result changed. On 19 November 2026 the owner asked for the same legibility, visual character and everyday context inside Bezeg, with a light touch. The ordinary Demonstrations are the teaching surface. A learner should be able to stop, reverse or repeat the interesting action.

## First release

| Demonstration | Student action | What should become visible |
| --- | --- | --- |
| Fastest descent, race mode | Play or scrub through the first arrival, then rewind. | Different bead shapes identify the tracks even when projected in grayscale. Reaching the finish reveals the first arrival and its computed time. Rewinding before that instant clears the finish cue. |
| De Casteljau | Scrub the parameter, play, or move a control point. | A single, distinct two-tone mark picks out the final constructed point among the interpolation levels. It stays attached to the actual end of the traced curve, including endpoints and coincident positions. |
| Voronoi, ordinary diagram | Move the query point across an edge or onto a vertex. | A quiet direct link identifies the nearest site. An exact tie indicates every equally near site. Direct links follow the existing diagram visibility and yield when they would obscure a more specialized construction. |
| Voronoi, optional pizzeria example | Choose the example, drag the customer across a boundary, then move or add a shop. | Start with two shops and a customer. Modest shop and customer marks identify the roles. The closest shop changes across the bisector and both shops are identified on it. Further sites use the same exact nearest-site rule. A readable textual answer accompanies the drawing. |

Keep the cream board, botanical palette, regular controls, bilingual interface and ordinary default examples. Put a visual cue at the point, boundary or finish it describes. Use the existing parameter, time and exact distance computations. The pizzeria example belongs in the graph’s example choices and must be possible to leave. Teaching icons should leave the mathematical point visible and draggable. The map represents straight-line distance. Provide keyboard-equivalent inputs, and keep result cues readable without sound, color discrimination or autoplay.

## Applying the approach to the collection

| Kind of graph | Example to evaluate after the pilots | What earns the visual addition |
| --- | --- | --- |
| Iterative construction | Bisection | One step visibly keeps half the interval. A persistent mark for the retained interval is valuable only if the current treatment hides that decision. |
| Linked representations | Unit circle and sine trace | Moving the circle point should direct attention to the same height on the trace. Use the existing projection and common height before adding a new mark. |
| Shape editing | Bézier control polygon or a spline join | Distinguish the handle the student moves from the part of the curve affected. A familiar drawing task can live in an example. |
| Accumulated outcomes | Random experiments | Highlight where one new observation enters the distribution while preserving the accumulated result. Coordinate any change with the existing first-use pilot. |

In each family, first try the current graph on a classroom-sized projection and on a phone. Ask a student to predict the result, perform one action and point to the evidence. If they can already do that, the existing treatment is sufficient. Choose a real-world setup when its assumptions match the model and a teacher can return to abstract exploration immediately. The three implementation routes above are the scope of this first release. The wider list guides subsequent selection.

## Acceptance

- Check the initial, active, finished or tied, and reset states that apply to each graph. Use exact ties and a change of nearest site for Voronoi, numerical first-arrival times for descent, and the evaluated curve point for de Casteljau.
- Exercise example changes, point edits, time/parameter scrubbing, scene replacement and saved Presets. Existing files and links remain valid. A saved pizzeria example restores its context if it is part of the stored scene.
- Inspect the actual three routes in desktop and compact layouts, including the changed controls at 310 px inspector width. Check Slovenian and English, keyboard operation, and the readability of marker shapes and labels at the finish and at ties.
- Keep board objects owned and disposed by the route. Avoid per-frame allocation of new graph objects and per-frame announcements during playback. Verify focused regressions, type checks, the production build and affected browser workflows.

The related [visual style specification](graph-visual-style.md) sets the graph palette. The [first-interaction proposal](graph-control-first-use.md) covers control discovery, and the [Voronoi lesson specification](triangulation-voronoi-lessons.md) defines the mathematical construction.
