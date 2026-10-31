# Bézier drawing playground

Status: approved for implementation (owner, 2026-10-31); unstarted. Parent: [Bézier study chapter](bezier-study-chapter.md). Renderer decision: [ADR 0020](../adr/0020-svg-drawing-playground.md).

## Purpose

The chapter currently opens by asking the reader to *imagine* shaping an outline in a design program. The playground lets them do it: draw a shape with a familiar pen tool before reading any mathematics, then see the same drawing again at the end of the chapter with the mathematics drawn over it.

The playground motivates the chapter. It does not replace the six activities. It has no exercises, scoring or completion gates, so the chapter's [learning boundary](bezier-study-chapter.md#learning-boundary) still holds.

The mathematical bridge is exact. A pen-tool path is a chain of cubic Bézier segments. In each segment, the anchor, its outgoing handle, the next anchor's incoming handle and the next anchor are exactly \(P_0, P_1, P_2, P_3\).

## Owner decisions (2026-10-31)

- **Why not the demonstration graphs.** They feel wrong for drawing, and that would make the curves look hard rather than the controls. In the existing workflow, *Dodajaj točke* adds a control point to one curve and so raises its degree (`AbstractJXGPointControlledCurve.addPoint`). Editing has modes and requires selecting a curve first. The board shows axes, labels and selection boxes, and has no closed shapes or fill. Phone drag on JSXGraph boards measured about 10 fps ([performance results](../bezier-performance-results.md)).
- **Renderer.** Plain SVG in one React component, scoped to the playground only. No new dependency, and no change to JSXGraph demonstrations. See [ADR 0020](../adr/0020-svg-drawing-playground.md).
- **Placement: one widget, one drawing, two places.** *Draw* mode sits in the `motivation` section. *Look underneath* mode sits in `next-ideas` and reopens the same saved drawing. The owner allowed a single placement. The handler kept both: the payoff is seeing *your own* drawing explained, and the second placement reuses the same component and saved drawing at little extra cost.
- **The one-curve comparison is in the first version.** Redrawing the shape as a single high-degree curve is the strongest motivation for joining pieces, and it is cheap.
- **Joins.** Anchor types give C0, G1 and C1 joins. G2 is not enforced; a curvature comb that shows it is a later item.

## Drawing model

A **drawing** is one path: an ordered list of 0 to 32 anchors and a `closed` flag. Each anchor has a position \(A\), an incoming handle \(H^-\), an outgoing handle \(H^+\) and a type: `corner`, `smooth-aligned` or `smooth-mirrored`. Coordinates are in a fixed user space (viewBox `0 0 1000 625`), independent of screen size. y points down, as in SVG; overlay labels never show coordinates.

Segment \(i\) joins anchor \(i\) to anchor \(i+1\), or the last anchor to the first when the path is closed. Its control points are \(P_0=A_i\), \(P_1=H_i^+\), \(P_2=H_{i+1}^-\), \(P_3=A_{i+1}\). The visible path is the SVG path `M A0 C H0+ H1- A1 …` (closed: a final `C` back to \(A_0\), then `Z`). SVG draws exactly these cubic Bézier curves, so the drawn shape and the chapter's mathematics are the same object.

**Handle constraints.** These are applied when a handle is dragged; \(A\) is the anchor and \(H\) the dragged handle:

| Type | The other handle becomes | Join at the anchor |
| --- | --- | --- |
| `corner` | unchanged | C0 |
| `smooth-aligned` | \(A - \lVert H'_{\text{old}} - A\rVert\,\frac{H - A}{\lVert H - A\rVert}\): same direction as before, keeps its own length | G1 |
| `smooth-mirrored` | \(2A - H\) | C1 |

Moving an anchor moves both its handles with it. Handles of the first and last anchor of an open path that have no segment are hidden and ignored.

**Join classification.** This is a function of the geometry, not of the stored type, so an imported or edited drawing is labelled truthfully. Segments are parametrized on \([0,1]\). The incoming derivative at the joint is \(3(A-H^-)\) and the outgoing one is \(3(H^+-A)\). Let \(u=A-H^-\) and \(v=H^+-A\), and use a relative tolerance of \(10^{-9}\) of the drawing's extent:

- **C1** if \(u=v\), including when both are zero.
- **G1** if \(u\) and \(v\) are both nonzero and point the same way (cross product ≈ 0, dot product > 0). The implementation measures "≈ 0" relative to the vectors, \(\lvert u\times v\rvert\le 10^{-9}\lVert u\rVert\lVert v\rVert\) (an angle of about \(10^{-9}\) rad), so the test does not depend on handle length; the C1 comparison uses the extent tolerance.
- **C0** otherwise. Continuity always holds at an anchor.

A label never claims more than holds.

**The one curve through all the points.** For an open path with \(k\) segments, list all control points in path order: \(A_0, H_0^+, H_1^-, A_1, \dots, A_k\). That is \(3k+1\) points, which define one Bézier curve of degree \(3k\). A closed path appends the closing segment and ends at \(A_0\) again. Evaluate it with the De Casteljau algorithm from the `src/bezeg` kernel, sampled at least 400 times, and draw the result as a polyline. Both curves start at \(A_0\) and end at the last control point, and both lie in the convex hull of the same points. The single curve passes through no other anchor in general. The overlay states the degree. The 32-anchor cap limits the degree to 96.

## Interaction

The canvas shows no axes, grid or coordinate labels in either mode. It uses the app's graph style tokens and the elderflower palette. A closed path gets a light fill tinted from the curve colour.

**Pointer (mouse, pen, touch through Pointer Events):**

- Click on empty canvas while the path is open: append a `corner` anchor.
- Press on empty canvas and drag: append a `smooth-mirrored` anchor; its outgoing handle follows the pointer.
- Click the first anchor of an open path with at least two anchors: close the path.
- Drag an anchor or handle: move it under the constraints above. Alt-drag on a mirrored handle switches that anchor to `smooth-aligned`.
- Double-click (double-tap) an anchor: switch between `corner` and `smooth-mirrored`. Switching to smooth places handles along the direction from the previous anchor to the next, at one third of the neighbouring chord lengths.
- Click empty canvas while closed: deselect. A drawing is one shape. *Clear* starts a new one.
- Use pointer capture during a drag, so no listeners are added to `window` or `document`. Set `touch-action: none` only on the canvas, so the page still scrolls when dragged outside it. On coarse pointers, anchors and handles have hit targets of at least 44 CSS px.

**Toolbar** (works with touch and keyboard): *Undo*, *Redo*, *Clear*, *Delete point* (selected anchor), an anchor-type choice for the selected anchor (corner / smooth G1 / smooth C1; the *Look underneath* labels name the joins), and *Load example*. The example is one authored drawing, so *Look underneath* is never empty for a reader who skipped *Draw*. Undo history keeps at least 100 steps. A drag is one step.

**Keyboard and assistive technology:**

- Each anchor and visible handle is a focusable SVG element with an accessible name, for example *Točka 3, gladka (C1)* / *Point 3, smooth (C1)*. Tab order follows the path.
- Arrow keys move the focused element by 5 units; Shift+arrow moves by 25. Delete/Backspace removes the focused anchor. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo and redo.
- *Add point* appends an anchor 60 units from the last one, so a shape can be built without dragging.
- A polite live region summarizes changes, for example *Oblika s 5 točkami, zaprta*. It must not announce every keystroke during a key repeat.

**Look underneath mode** adds overlay switches to the same canvas and editing behaviour:

1. **Control points:** the control polygon of every segment. The selected segment (click it, or use the previous/next segment buttons) shows labels \(P_0\)–\(P_3\) and its \(P_0P_1P_2P_3\) polygon highlighted.
2. **De Casteljau:** a \(t\) slider with an editable value, as in the shared controls. It shows the construction rows and the point \(B(t)\) on the selected segment.
3. **Joins:** a C0, G1 or C1 label at each joint, using the classification above.
4. **One curve through all the points:** the degree-\(3k\) curve drawn over the shape in a contrasting colour, with its degree stated.

Edits in either mode update all overlays immediately.

## Chapter integration

- Add a `{kind: 'playground'; mode: 'draw' | 'inspect'}` block to the chapter's `ChapterBlock` union in `src/learning/content/bezierChapter.ts`, rendered by the chapter page. Place `draw` in `motivation` after the opening scenario, and `inspect` in `next-ideas` before the further-questions paragraph. Load the component lazily on the chapter route. Activity IDs, routes and return sections are unchanged.
- New prose in both languages, in `bezierChapter.ts` and the [Slovenian](../content/bezier-curves.sl.md) and [English](../content/bezier-curves.en.md) source copy:
  - In `motivation`: an invitation to draw something and notice how points and handles bend the line. No mathematics yet.
  - In `next-ideas`: a short passage. Each segment of your drawing is a cubic Bézier curve with \(P_0\)–\(P_3\) as above. Smooth points keep the tangent directions equal (G1), and mirrored handles also keep the derivative equal (C1). One curve through all the same points has degree \(3k\) and passes through only the first and last point. Joining low-degree pieces keeps editing local. Link to the [spline demonstrations](/bezeg-2.0/spline/spline).
  - Lesson math-notation rules apply, and `lessonMathNotation.test.ts` must pass.
- New Slovenian terms (for example the playground's name, *anchor*, *handle*, *corner point*, *smooth point*) are chosen during implementation by the [term process](../localization.md#choosing-new-terms) and recorded in its table, with sources in this spec. Prefer existing words: *točka*, *stik*, *zveznost*, *kontrolna točka*, *kontrolni poligon*.

## Terms

Chosen during PG2 by the [term process](../localization.md#choosing-new-terms). No web research was possible in the implementing session, so the basis is in-repo reuse and general Slovenian usage; revisit if the owner or a reviewer finds a better-established term.

- *anchor* → **točka**, with **kotna točka** (corner) and **gladka točka** (smooth). Reuses *točka*, the repository's word for any point (`add_point`, `delete_point`); *kontrolna točka* stays reserved for the control points \(P_0\)–\(P_3\) of the mathematics.
- *handle* → **ročica**. The usual word for a Bézier handle in Slovenian design software and tutorials (not independently verified here); it is distinct from *kontrolna točka*, which fits the later reading that handles are control points.
- *shape* → **oblika**; *undo* → **Razveljavi**, *redo* → **Ponovi** (the standard Slovenian editor commands).
- Join types in names: *kotna (C0)*, *gladka (G1)*, *gladka (C1)*, using the same C0/G1/C1 names as the classification.

## Persistence

- Save the drawing through `appStorage` under `bezier-playground.drawing.v1` after each committed change (drag end, keystroke, toolbar action). Do not save on every pointer move. Wrap every access in a try/catch, and work without storage.
- On load, validate the structure: finite coordinates, a known anchor type, at most 32 anchors, and a boolean `closed`. Discard invalid data, start with an empty drawing, and log a warning. Nothing crashes.
- This is a new key. No route or existing Preset changes, so no breaking change.

## Module boundaries

- `src/learning/playground/drawingModel.ts` (no React, no DOM): types; pure operations (append, move anchor or handle with constraints, set type, delete, close, clear); `toSvgPath`; `segments()` returning the cubic control points; `classifyJoint`; `singleCurveControlPoints`; validation; and an undo history.
- `src/learning/playground/DrawingPlayground.tsx`: SVG rendering, pointer and keyboard input, toolbar, overlays. Gets `t` from `useT()`. Overlay evaluation calls the `src/bezeg` kernel.
- No graph-global state, no JSXGraph and no scene store. The component owns its listeners through React props and pointer capture.

## Acceptance criteria

1. **Mathematics.** Unit tests cover the following. `segments()` gives the \(P_0\)–\(P_3\) mapping above for open and closed paths, and the SVG path string encodes the same points. Evaluating each segment with the kernel at \(t\in\{0,\tfrac14,\tfrac12,1\}\) matches the cubic Bernstein form to \(10^{-12}\). Each constraint holds after the matching handle drag (mirrored: \(H^-+H^+=2A\); aligned: collinear, opposite, and the other handle's length unchanged). `classifyJoint` gives C1, G1 and C0 on constructed cases, including zero-length handles. The single curve has \(3k+1\) control points, starts and ends at the first and last control point, and its samples lie in the convex hull of its control points. Its De Casteljau value at \(t=\tfrac12\) matches the Bernstein form for a degree-96 example to \(10^{-9}\).
2. **Interaction.** Real browser checks on desktop and narrow (390×844, touch emulation) cover: corner and smooth anchors, closing, dragging anchors and handles, Alt-drag to aligned, double-click type switching, undo/redo across drags, delete, clear, load example. Page scroll outside the canvas still works on touch. The keyboard-only path builds and closes a four-anchor shape and moves a handle.
3. **Look underneath.** All four overlays are correct on the authored example and on a user-edited drawing. The \(t\) slider at \(0\), \(\tfrac12\) and \(1\) puts \(B(t)\) on \(P_0\), on the drawn segment and on \(P_3\). Joint labels change when an anchor type changes.
4. **Persistence.** The drawing survives a reload and appears in both placements. Invalid stored data and blocked storage both start an empty playground without errors.
5. **Performance.** Measured on the production build following the [performance plan](../performance-plan.md): handle drag on a 20-anchor closed drawing, with and without all overlays (one-curve overlay included), on desktop and with 4× CPU throttling at narrow width. Record the median and p95 frame interval next to the JSXGraph phone baseline. Target: median ≤ 16.7 ms desktop and ≤ 33.3 ms throttled. A miss is reported to the owner before release, not hidden.
6. **Localization.** All new copy and accessible names exist in `sl.ts` and `en.ts` in lockstep. Switching language live updates the toolbar, labels and live region. `npx tsc --noEmit --pretty false` and the production build pass. New terms are recorded.
7. **Chapter.** The two blocks render in the right sections in both languages. Existing chapter tests and activity behaviour are unchanged. A smoke test covers `/bezeg-2.0/learn/bezier-curves` in both languages.
8. **Lifecycle.** Unmounting the playground leaves no listeners on `window` or `document`. Navigating away during a drag leaves no stuck state.
9. **Docs.** Update capabilities, UI functionality and the parent chapter spec to describe the playground. ADR 0020 is accepted.

## Delivery slices

1. Drawing model, undo and validation, with the mathematical tests (criterion 1). Pure TypeScript; a worker can do this alone.
2. Canvas, pointer and keyboard editing, toolbar, persistence (criteria 2, 4, 8).
3. *Look underneath* overlays and the one-curve comparison (criterion 3).
4. Chapter blocks, bilingual prose, terms, docs, performance measurement and smoke test (criteria 5–7, 9).

Slices 1 and 2 can overlap once the model interface is fixed. Estimate: about 1–1.5 weeks of focused work in total.

## Out of scope

Multiple shapes or layers, inserting an anchor on a segment, boolean operations, stroke styling, zoom and pan, enforced G2 or C2 continuity, and freehand curve fitting. Also out: any change to JSXGraph demonstrations, routes or Presets. Later candidates: tracing templates (for example an elderflower blossom), SVG download of the drawing, a curvature comb that shows G2.
