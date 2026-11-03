Method: independent A/B browser review (A: three family reviewers and two focused continuations; B: `graph_review_technical`). The deterministic detector was blocked.

# Recent finalized graph UX audit — 2026-11-03

The desktop graphs generally look coherent and usable: large boards, restrained colors and useful mathematical readouts. The clearest problems are mobile projective composition and visual separation inside busy constructions. No persistent functional control failure was confirmed in the exercised flows.

For qualitative color choices across opening, middle and final lesson scenes, see the subsequent [palette and visual-appeal critique](../graph-aesthetics-2026-11-03/report.md). Its fresh reviewers identify weaker-looking examples that this defect-oriented pass did not surface.

Six reviewers were requested as GPT-6 Luna at maximum effort. All **45 included finalized lessons** reached their final frames: 18 geometry, 14 functions/projective and 13 curves/probability/maps. This establishes walkthrough coverage; control coverage is limited to the recorded actions. The frozen production target was `d2a3b6465f541c687811692f4ae1b3f720483141`, selected from the rolling window **30 October, 20:05 CET–3 November, 20:05 CET**. Ongoing batches were excluded. See [scope and dispatch evidence](scope.md).

## Prioritized graph findings

Two P2 usability defects and three P3 clarity/polish findings were retained. No P0 or P1 issue was confirmed. Priorities describe this audit's observed impact, rather than a comprehensive accessibility or mathematical certification.

| Priority | Reproduce and observe | User impact and suggested direction | Evidence |
| --- | --- | --- | --- |
| **P2 — Three Views mobile composition** | Finish `projective-three-views`, hide the lesson and inspect at 390×844. Both panels stay side by side in a roughly 364 px board; the source title is clipped and a line label crosses the shared axis. | Comparing the two small conics and reading their labels takes extra effort. Stack the panels or offer a source/image focus control, preserving the scale needed for comparison. | [Mobile capture](evidence/functions-projective-three-views-narrow-390.png); [F1](functions.md#f1--p2-three-views-comparison-becomes-cramped-on-a-narrow-screen) |
| **P2 — Cross-ratio mobile labels** | Open `/projective/cross-ratio` with the default example at 390×844. Source/image point labels and M/N crowd together near the origin. The page itself fits. | Learners cannot readily match points to their projected images. Offset or selectively reveal labels and improve the narrow-board framing. Point dragging did update the coordinate and exact ratio. | [Mobile capture](evidence/technical-projective-mobile.png); [technical review](technical.md) |
| **P3 — Polygon-area decomposition** | In the final `polygon-area` scene at 1440×900, keep “Triangles from the first vertex” and numeric values enabled. Internal triangle boundaries are indiscernible and a `+12` contribution overlaps a lattice cross. | The numeric contributions are difficult to associate with their triangles. Distinguish the component boundaries/fills and move the value away from the lattice mark. | [Final scene](evidence/geometry-polygon-area.png); [geometry review](geometry.md) |
| **P3 — Shared intersection visual hierarchy** | In the terminal `segment-intersections` scene at 1440×900, all four segments converge at one event and have similarly heavy strokes. | The crossing dominates the event marker and makes the trace harder to follow. Give the current event a distinct treatment while retaining all four segments' simultaneous participation. This is a visual opportunity; the shared event is intentional. | [Final scene](evidence/geometry-segment-intersections.png) |
| **P3 — Pascal mobile construction clutter** | Open `projective-pascal` at 390×844. Extended sides, intersections and the Pascal line compete within the small board. | The main construction lacks a clear visual hierarchy. Soften inactive supporting lines/labels and emphasize the conic, hexagon and Pascal line. Intersections described as outside the window are intentional. | [Mobile capture](evidence/functions-projective-pascal-narrow-390.png); [F2](functions.md#f2--p3-pascals-narrow-graph-gives-auxiliary-lines-too-much-visual-weight) |

The first two are the strongest candidates for a focused responsive pass. The polygon finding also affects desktop teaching. The remaining two concern emphasis within valid constructions. The handler directly inspected every finding's cited screenshot, confirmed the additional cross-ratio finding from B, and corrected the shared-event description to four segments/eight endpoints. No fix was implemented.

## Controls and strengths

Sampled controls produced relevant state changes: point drags updated orientation, projective equations and polynomial roots; dataset, matrix and NURBS weight edits changed geometry/readouts; de Boor levels and CLT playback advanced visibly; Fourier keyboard selection and view switching changed the displayed coefficients/plots. The three-views slider changed conic type and discriminant. These observations support the positive control verdict within the recorded coverage.

Representative narrow views stacked the inspector below a 364×295 graph and kept it reachable by scrolling. Wide captures kept the graph prominent beside the inspector. Fourier's long desktop inspector was independently scrolled to expose lower controls. These checks found no horizontal document overflow on the sampled routes; readable labels still need the improvements above. The elderflower palette and graph-first layout remained consistent.

Detailed action evidence and route-by-route limits: [geometry](geometry.md), [functions and projective](functions.md), [curves, probability and maps](curves-maps.md), [independent technical pass](technical.md). The three initial handoffs preserve the completed walkthrough record.

## Secondary observation and limits

The opening B-spline basis recurrence extends past its visible math block. Horizontal scrolling recovers it, but the cue is weak. This is a lower-priority lesson-layout observation outside the main graph/control findings. [Capture and measurements](curves-maps.md#p3--opening-recurrence-extends-beyond-the-visible-math-block).

- **Responsive scope:** Chromium at 1440×900, with the independent technical interactions at 1440×1000; selected routes at 390×844 and 1920×1080. Viewport emulation does not establish physical touch, classroom/projector readability or screen-reader accessibility. Attempted browser text enlargement did not change the computed size, so enlarged-text behavior remains unverified.
- **Control gaps:** Semantic Play/Reset confirmation remains incomplete for convex hull, monotone partition and monotone triangulation; Next-step trace progress was confirmed. Some initial numeric edits retained input acceptance without detailed board response. de Boor reached its terminal level before a distinct mid-animation pause could be observed. All 45 walkthroughs do not imply exhaustive control coverage.
- **Performance and mathematics:** No frame-time measurement, exhaustive mathematical validation or insertion-equivalence proof was performed. No persistent runtime failure was observed in the sampled runs.
- **Evidence repair:** Early functions captures selected toolbar icons instead of the main board. Those captures were removed, their SVG-change claims discarded, and representative screenshots recaptured from `#jgbox > svg`. Conclusions here use corrected screenshots and semantic control/readout evidence.
- **Independent technical review:** A judgments were completed before the handler read B findings. B added the cross-ratio label finding and action evidence. The Impeccable context/slug setup and detector could not run because engine 0.1.17 was unavailable and cache setup required network/write access outside the workspace. There are no detector counts or claims of detector agreement. Headless browser evidence and existing PRODUCT.md/DESIGN.md supplied the fallback; no visible overlay or overlay server was started, and no detector snapshot/trend was produced.

The preview was a frozen production copy; this report makes no claim about later app changes. App source and presets were not changed. Audit artifacts and cleanup/check results are recorded in [scope.md](scope.md).
