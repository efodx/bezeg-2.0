# 22 — Fortune's algorithm kernel (C5)

Status: planned 2026-11-03 (geometry handler 43). Source: [spec C5](../../specs/sweep-algorithms-lessons.md#c5-fortunes-algorithm-showpiece) (default and second examples, exactness, output value, acceptance 1–4), [trace model](../../specs/sweep-algorithms-lessons.md#event-queue-and-status-trace-model-batch-s0), [correctness notes](../../specs/sweep-algorithms-lessons.md#correctness-notes), [ADR 0035](../../adr/0035-sweep-coordinates-and-exact-event-order.md). Kind: F1, mathematical review. Depends on 02 (`sweepTrace.ts`, `eventOrder.ts` with `compareSurdHeights`), `limits.ts` (`SWEEP_MAX_SITES` 12), convexity `predicates.ts` (`orient`, `incircle`), and triangulation 05 (`voronoi.ts`: the `VoronoiDiagram` value, `voronoiFromDelaunay`, `dualEdges`). Reuse constraints: [18-fortune-reuse.md](../../reviews/triangulation-voronoi/18-fortune-reuse.md).

Pure TypeScript in `src/compgeo/sweep/fortune.ts`, free of React and JSXGraph. Reference: dBCKO §7.2.

## Decisions (handler 43, 2026-11-03)

- **Order.** Site events are at their grid heights. Circle events are at \(c_y-\sqrt{R^2}\), with \(c_y\) and \(R^2\) rational, compared through `compareSurdHeights`. A site height is the case \(r=0\). Ties go by increasing \(x\), where a circle event's \(x\) is its centre's \(x\). An exact tie between a site event and a circle event is processed as follows, and the module comment states the rule:
  - the circle event goes first when the site lies on that circle;
  - otherwise the family order applies.
  The mathematical review checks the rule against brute force. No double ever enters the queue.
- **Beach line.** The status is the ordered array of arcs, as the family decided. Arc ids are unique, because a site can own several arcs. The result carries `arcSite: number[]` (arc id → site index), so `sweepStateAt` folds the beach line as arc ids and the graph maps them to sites. Each breakpoint between arcs \(i\) and \(j\) records the Voronoi edge it traces, as an index into the output diagram's `edges`.
- **Which arc lies above a new site.** At sweep height \(\ell=s_y\), the parabola of site \(p\) (with \(p_y>\ell\)) has the rational height \(y_p(s_x)=\frac{(s_x-p_x)^2+p_y^2-\ell^2}{2(p_y-\ell)}\). The beach line is the lower envelope of these parabolas. Comparing \(s_x\) with the breakpoint of two adjacent arcs is then a sign test on rationals at \(x=s_x\), together with the condition that picks the correct one of the two parabola intersections.
  - Derive that condition, state it in the module comment, and verify it against brute force: the arc above \(s\) is the arc whose site gives the minimal \(y_p(s_x)\) among the sites present on the beach line.
  - Sites at the same height as \(s\) have no parabola yet. They make pointed (vertical) arcs: equal-\(y\) first sites start the beach line as vertical bisectors, and the tie rule decides their order.
  - The spec's fallback (a combinatorial circle test) is used only if the derivation fails review. Record which one was used.
- **Circle events.** For three consecutive arcs \((a,b,c)\), an event is scheduled iff the breakpoints converge, that is, iff `orient(a, b, c)` has the sign that dBCKO uses for a downward sweep. Its height is the lowest point of the circumcircle, and its payload is the centre and \(R^2\) as rationals. A site event that splits arc \(b\), or an adjacent circle event that removes \(a\) or \(c\), **cancels** the event (a false alarm, `cancel`). The test asserts that each cancelled circle contains a site strictly inside (`incircle`).
- **Output.** A `VoronoiDiagram` with exactly the shape of `voronoiFromDelaunay`'s value, as listed in the reuse review: exact vertices with their site lists, segment, ray and line edges, `cells[s].site === s`, and ray directions as integer vectors pointing away from the remaining sites.
  - Four or more cocircular sites yield one vertex of degree 4 or more, even when several circle events share a centre. Merge by exact centre equality.
  - Collinear sites yield `line` edges and no vertices.
  - Equality with the Delaunay dual is checked by a helper `sameVoronoiDiagram(a, b)` in the kernel tests: the same vertex set (exact), the same edge incidences up to vertex order and edge orientation, and the same ray directions up to positive scale. Promote the helper to the kernel only if the graph needs it.

## Scope

1. `fortuneTrace(sites)` returns `{ok: true, trace, arcSite, circles, diagram}` or a typed refusal, raised before any trace in this order:
   - fewer than two sites;
   - more than `SWEEP_MAX_SITES`;
   - coordinate refusals (`checkSweepPoints`);
   - duplicate sites (naming both indices).

   `circles` lists every scheduled circle event with its triple of arc ids, its site triple, its centre, \(R^2\), and its fate: `executed` or `cancelled`, with the trace index of the `cancel`.

   Trace kinds:
   - `phase` (start);
   - `pop` (site or circle event);
   - `status-insert` and `status-remove` (arcs);
   - `schedule` and `cancel` (circle events);
   - `report` (a Voronoi vertex);
   - `done`.

   Each event's `predicateCount` counts its exact tests.
2. `fortuneStateAt(result, index)` returns `sweepStateAt` plus the beach line as site ids, the open breakpoints with their traced edge, the sweep height (rational, or a surd \(q-\sqrt r\)), and the vertices reported so far. The graph needs no second lookup.
3. Tests:
   - The default example \(A=(0,5)\), \(B=(-4,3)\), \(C=(4,3)\), \(D=(0,-3)\):
     - site events in the order \(A,B,C\), then the beach line \(A,B,A,C,A\);
     - the triple \((B,A,C)\) is scheduled with centre \((0,0)\), \(R^2=25\), height \(-5\);
     - \(D\) at \(-3\) splits the arc of \(A\) and cancels that event, and the circle contains \(D\);
     - two true events at \(1-\frac{\sqrt{65}}2\) with centres \((-\frac12,1)\) then \((\frac12,1)\) (tie broken by \(x\)), each reported once;
     - the final diagram has 2 vertices, 1 finite edge on \(y=1\) and 4 rays.
   - The second example (no \(D\)): one executed event, vertex \((0,0)\).
   - Random general-position grid sets (\(n\le12\), \(|c|\le10\), seeded): `sameVoronoiDiagram(fortune, voronoiFromDelaunay)`. In every case:
     - each `cancel` has a site strictly inside its circle;
     - each executed event's circle is empty of sites;
     - the vertex count is \(2n-2-h\) or fewer (fewer when degenerate);
     - the arc found above each site agrees with the brute-force minimum of \(y_p(s_x)\).
   - Degenerate inputs, each kernel-tested:
     - equal-\(y\) sites, including all sites at one height;
     - duplicates (refused);
     - all sites collinear (parallel `line` edges, no vertices; equal to the dual);
     - four cocircular sites (one degree-4 vertex; equal to the dual);
     - a site directly below a breakpoint (a vertex at once).
   - Observed failures under deliberate mutations:
     - the cancel on a split dropped;
     - circle events scheduled for diverging triples;
     - surd heights compared as doubles (find a case where this breaks the order, or report that none exists within the limits);
     - the wrong root chosen in the breakpoint test.

Checks: `just unit src/compgeo/sweep --maxWorkers=2`, `just lint src/compgeo/sweep`, `npx tsc --noEmit --pretty false`.
