# Geometry graph UX review

**Target:** frozen production preview `http://127.0.0.1:4323/bezeg-2.0/`, revision `d2a3b6465f541c687811692f4ae1b3f720483141`. **Browser:** installed Playwright Chromium. **Viewports:** 1440×900 baseline, plus 390×844 and 1920×1080 for the busiest graph. Initial design review preceded the separate detector pass. No source changes were made; no page errors were observed.

## Coverage

All 18 in-scope geometry lessons reached terminal progress and were visually inspected at 1440×900. The completed walkthrough and screenshot coverage from the first reviewer is preserved here; it is not repeated as new work.

| Lesson graph | Terminal progress | Interaction exercised in initial pass |
|---|---:|---|
| triangle-centres | 7/7, 1/1 | Acute → obtuse example; board changed |
| inscribed-angle | 7/7, 1/1 | General → Thales example; board changed |
| euler-line | 7/7, 1/1 | Acute → right example; board changed |
| simson-line | 7/7, 1/1 | Circumcircle grid-point example |
| inversion | 7/7, 1/1 | Point drag; marker moved |
| orientation | 6/6, 2/2 | Follow-up added third point and dragged it across the baseline; readout changed +8 left → −8 right |
| polygon-area | 7/7, 2/2 | Follow-up dragged P5 from (2,5) to (2,4); polygon changed. Numeric readout was hidden in the fresh initial frame, so value change was not confirmed |
| convex-hull | 7/7, 2/2 | Follow-up Next step changed trace 1/74 → 2/74 and orientation tests 7 → 14; Play/Reset semantic trace was inconclusive |
| ear-clipping | 7/7, 3/3 | Reset and point drag; marker moved |
| point-set-triangulation | 7/7, 3/3 | Selected interior edge P1–P5; board changed |
| delaunay | 7/7, 3/3 | Next step and Reset changed board |
| voronoi | 7/7, 2/2 | Follow-up moved a site marker one grid increment (38 screen px); Grid toggle visibly enabled. Query point remained (−2,1), nearest site P1 |
| voronoi-degenerate | 7/7, 2/2 | Point drag; marker moved |
| interval-sweep | 7/7, 2/2 | Next step, Play, Reset changed board |
| segment-intersections | 7/7, 2/2 | Next step, Play, Reset changed board |
| monotone-partition | 8/8, 2/2 | Follow-up Next step changed trace 0/14 → 1/14 and processed start vertex v6; Play/Reset semantic trace inconclusive |
| monotone-triangulation | 7/7, 2/2 | Follow-up Next step changed trace 15/43 → 16/43 and pushed v6; Play/Reset semantic trace inconclusive |
| fortune | 7/7, 3/3 | Reset and point drag; marker moved |

The three follow-up Next-step checks confirm semantic trace progress. Play and Reset were present in the inspector, but the trace text was no longer available to this continuation after Play, so their semantic behavior remains unverified here; the first reviewer observed board changes for both.

## Findings

### P3 — Polygon-area decomposition is hard to see

**Repro:** Open the polygon-area guided example and show the final numeric overlay. With “Triangles from the first vertex” checked, inspect the filled polygon and the `+12` contributions. At 1440×900 the interior triangle boundaries are not discernible; one `+12` sits on the lattice cross near (1,1), while the other contributions float in the filled area. On the fresh initial scene, switching the triangle checkbox off still left no visible internal boundaries; enabling lattice points added crosses without clarifying which value belongs to which triangle. The final-frame screenshot also shows the label overlap. The continuation’s initial frame hid numeric values, so the overlay comparison is limited to that frame plus the preserved final screenshot.

**Expected:** The checked decomposition and its per-triangle signed values identify the same triangle regions clearly. **Actual:** The polygon reads as one filled shape; the values cannot be mapped reliably to component triangles, and a value collides with a lattice mark. **Impact:** Students may not see how the shoelace sum is assembled. **Suggestion:** Draw the diagonals from the first vertex or give each triangle a distinct light fill, then anchor and offset its value away from lattice marks.

Evidence: [terminal polygon capture](evidence/geometry-polygon-area.png), [dragged polygon with decomposition checked](evidence/geometry-finish-polygon-area-drag.png), [decomposition unchecked](evidence/geometry-finish-polygon-no-triangles.png), [lattice points enabled](evidence/geometry-finish-polygon-lattice-on.png).

### P3 — Segment-intersections shared event overprints

**Repro:** Open the terminal segment-intersections lesson example at 1440×900 and leave the four-segment shared-event configuration (eight endpoints). The thick dark segments converge at one center and dominate the event marker. All four segments participate in the same event; their equal emphasis is mathematically meaningful, but the event and trace are visually hard to separate. The sweep controls and trace do work.

**Expected:** The current event and corresponding trace remain easy to identify. **Actual:** The dense coincident crossing dominates the graph. **Impact:** It is harder to connect the event marker with the trace. **Suggestion:** Give the current event marker a distinct treatment and soften secondary strokes where appropriate, retaining every segment's participation in the simultaneous event. This is a visual-hierarchy opportunity, not a defect in the shared-event example or its mathematics.

Evidence: [terminal segment-intersections capture](evidence/geometry-segment-intersections.png).

### Aesthetic opportunity — long triangle titles wrap

At 1440×900, triangle-centres, inscribed-angle, and euler-line titles wrap onto two lines, reducing graph headroom slightly. The board remains prominent and usable; this is polish rather than a blocker.

## Responsive and interaction review

- **390×844:** Segment-intersections had no horizontal overflow. The graph occupied 364×295 px with the inspector below it; the full inspector remained reachable by scrolling. Focusing **Next step** and pressing Enter advanced the semantic trace from step 1 to step 2 of 47. The graph and control labels remain readable at this size, though the dense crossing still looks busy. [Mobile capture](evidence/geometry-finish-segment-mobile.png)
- **1920×1080:** No horizontal overflow. The graph occupied 1482×680 px and the inspector fit beside it at 310 px wide. [Wide capture](evidence/geometry-finish-segment-wide.png)
- **Orientation:** Added (r=(1,2)), then dragged the actual point below (pq); the determinant/status changed from `+8: left turn` to `−8: right turn`. [Capture](evidence/geometry-finish-orientation-drag.png)
- **Voronoi:** A visible site marker moved by one grid increment; the grid toggle turned on and the query readout remained coherent (`(−2,1)`, nearest site P1). [Capture](evidence/geometry-finish-voronoi-controls.png)

## Verdict and strengths

No P1 or P2 issue was confirmed. Graphs remain large and central, the elderflower palette is restrained, and the geometry lessons pair visible constructions with useful textual or numeric state. Pointer editing and keyboard activation worked in the sampled flows. Main follow-up gap: semantic Play/Reset confirmation on the three algorithm traces; no physical-device touch check was made.
