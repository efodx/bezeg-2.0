# 23 — Fortune graph and beach-line measurement (C5)

Status: planned 2026-11-03 (geometry handler 43). Source: [spec C5](../../specs/sweep-algorithms-lessons.md#c5-fortunes-algorithm-showpiece) (capabilities, steps, acceptance 5), [testing decisions](../../specs/sweep-algorithms-lessons.md#testing-decisions) (performance), [performance plan](../../performance-plan.md), [reuse review](../../reviews/triangulation-voronoi/18-fortune-reuse.md). Kind: F2a; engineering, mathematical and UI/accessibility reviews. Depends on 22, the point-set graph core, triangulation 18 (`voronoiDrawing.ts`) and 19 (`VoronoiGraph`, whose follow-view and marker behaviour this graph must match).

## Decisions (handler 43, 2026-11-03)

- **Drawing split (reuse review, verdict accepted).**
  - While the sweep runs, the graph draws its own objects, owned and disposed by the graph:
    - the sweep line;
    - the beach line as parabola polylines, labelled "drawn approximately" / "narisano približno" in the legend;
    - breakpoint markers;
    - the half-edges traced so far, each from its known vertex to its moving breakpoint;
    - scheduled circles and their lowest points;
    - cancelled circles (dashed, with a distinct marker shape, not colour alone);
    - the Voronoi vertices reported so far.
  - At `done`, the final value goes to `createVoronoiDrawing(...).update` exactly like the Voronoi graph does. The `VoronoiDiagram` value is not widened. The "final cells" sub-diagram refinement is out of scope.
  - Exact clipping may reuse `clipToBox` and `edgeInBox`. Doubles appear only in drawing, and the drawn beach line never feeds back into the kernel.
- **Measure first.** Before choosing how to draw the beach line, measure in a production preview in Chromium at 1440×900:
  - the 12-site preset with the sweep at a step that has its longest beach line;
  - one site dragged continuously for about 3 s;
  - median and p95 frame interval, recorded in `docs/reviews/sweep-algorithms/23-perf.md`.

  Compare at least two approaches: one JSXGraph curve per arc sampled at a fixed count, and one polyline for the whole beach line updated in place. Choose by measurement. Dragging must recompute the whole trace (spec) and keep the current trace step by index, clamped. Stop and report if no approach reaches a median of 16.7 ms.
- **Steps.** The trace step control and stopped-by-default playback come from the sweep graphs (08, 09, 16, 17). The current sweep height shows exactly in the readout: a rational, or \(q-\sqrt r\) written in LaTeX with its rounded value. The beach line reads as site names in order (for example "A, B, A, C, A") and is announced in a live region.

## Scope

1. `src/graphs/compgeo/FortuneGraph.tsx` (point-set mode, at most 12 sites) with its controls and presets:
   - the default example (A–D);
   - the second example (no D);
   - collinear;
   - four cocircular;
   - 12 random sites in general position.

   Readouts: the event kind and name, the queue with cancelled entries struck through (and named so in text), the beach line, and vertices found / expected. Refusals use the kernel's typed reasons, with an actionable message (duplicates name both sites).
2. Ownership: every board object belongs to the graph session and is reused across steps and disposed on unmount and on scene replacement. A host test counts objects after 20 step changes and after a drag.
3. Follow view: the clip box and markers follow the board's visible view the same way as the Voronoi graph after geometry handler 43's marker fix. "Continues" markers stay inside the visible board.
4. Tests (host, jsdom):
   - the default example at each step: arc count, beach line as site names, the dashed cancelled circle present after D's event;
   - the final drawing equals the `VoronoiGraph` drawing of the same sites (the same `drawingStats`);
   - Reset view and Reset example;
   - the step index is kept after a drag;
   - keyboard step control;
   - the live-region text in both languages.

   Each new assertion has an observed failure under a mutation.
5. Docs: `docs/capabilities.md` entry; glossary terms *obalna črta / beach line*, *krožni dogodek / circle event*, *lažni alarm / false alarm*, if not present.

Checks: focused `just unit` of the graph and kernel, `just lint` on the touched paths, `npx tsc --noEmit --pretty false`, `just build`, the measurement above, and a focused browser check of the route at 1280×720 and 390×844.
