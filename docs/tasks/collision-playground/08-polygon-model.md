# CP8 — Polygon templates and SAT narrow phase (pure)

Source: spec [Mathematical model](../../specs/collision-playground.md#mathematical-model) ("Batch C bodies"), [Module boundaries](../../specs/collision-playground.md#module-boundaries), acceptance criterion 1 (batch C bullet). Batch C. Kind: kernel; mathematical review.

**Owned paths:** `src/compgeo/collisions/{polygonTemplates,narrowPhase,broadPhase,world,sweepTrace}.ts` and their tests. No React, DOM, worker or JSXGraph imports. Circle behaviour, counters and tests stay unchanged.

**Settled decisions (handler, 2026-11-08; record them in the spec's Mathematical model in this task):**

- **Templates.** Five to seven fixed simple polygons on grid points, counter-clockwise, at most 12 vertices each, no collinear consecutive vertices. Most are concave (for example L, U, chevron, notched star, comb); at least one is convex, so the hull stage visibly removes nothing for it. Each template's bounding box is centred at the origin, so a body's box is \([x-h_x,x+h_x]\times[y-h_y,y+h_y]\).
- **Computed once per template**, with the exact kernels on the integer template:
  - hull: the final hull of `monotoneChainTrace` (`src/compgeo/monotoneChain.ts`), collinear points dropped;
  - triangles: `earClippingTrace` (`src/compgeo/earClipping.ts`);
  - convex pieces: Hertel–Mehlhorn. Remove a diagonal when both of its endpoints stay convex in the merged piece, decided with exact `orient` from `src/compgeo/predicates.ts`;
  - per hull and per piece: vertex list, integer edge normals \((-\Delta y,\Delta x)\).
- **Size.** One scale \(s\) per world, the same for every body (the templates themselves differ in size), chosen so that bodies cover the same 1.25 % area fraction as circles. The bodies have no per-body radius spread. A body is its template scaled by \(s\) and translated by its position, never rotated.
- **Broad phase.** `BroadBodies` gets half-extents `hx`, `hy`. For circles both alias the `r` array (the same `Float64Array`, no copy), so the circle results and CP3's costs are unchanged. Walls reflect on `hx`, `hy`.
- **SAT.** Two convex polygons are separated when some axis among both polygons' edge normals gives a strictly positive gap; touching (gap 0) counts as touching, as for circles. Compute the projections on an integer normal \(m\) as \(s\,(m\cdot p)+m\cdot t\), with \(m\cdot p\) the exact integer projection of a template vertex \(p\) and \(t\) the body position. The hull's extreme integer projection bounds every piece's, and rounding is monotone, so a hull separation can never hide a pair that the piece test would keep. Write that argument in a comment next to the code and in the spec.
- **Pipeline.** box → hull SAT → piece-pair SAT, stopping at the first touching piece pair. The two bodies touch exactly when some piece pair touches (the pieces tile each template).
- **Counters.** `StepCounters` gains `hullTests`, `hullPasses` and `pieceTests`, which are 0 for circles. The readouts derive the removed pairs from them: box stage \(\binom n2-\text{candidates}\), hull stage \(\text{candidates}-\text{hullPasses}\), piece stage \(\text{hullPasses}-\text{touchingPairs}\).
- **API.** `createWorld({seed, count, shape?: 'circle' | 'polygon'})` (default `'circle'`; a polygon world also stores a per-body template index `Uint8Array` and the scale). `stepWorld` and `measureWorld` dispatch on the shape. Keep the per-step allocation rule from CP1.

**Checks (each new assertion must be seen failing first, for example by keeping a reflex diagonal, using `<` for touching, or skipping a hull edge normal):**

- For every template: the hull contains every template vertex (exact `orient` ≥ 0 against each hull edge); each piece is convex (exact `orient` > 0 at every vertex); the doubled piece areas sum exactly (bigint) to `doubledSignedArea` of the template; every piece vertex is a template vertex; the number of pieces is at most the triangle count.
- For seeds 1–50 and \(n\in\{0,1,2,10,200,1000\}\) over 120 steps of polygon worlds: both broad phases give identical touching sets, and the box → hull → pieces pipeline gives the same set as testing every piece pair of every body pair directly.
- Exact touching cases with \(s=1\) and integer positions: shared edge, shared vertex, a vertex on an edge, nested in a concave notch without contact (hull overlaps, pieces do not), and a one-unit gap. Compare with an independent integer SAT over the same pieces.
- Polygon bodies stay inside the world. The same seed and \(n\) reproduce identical positions. All circle tests pass unchanged.

Run `just unit src/compgeo`, `npx tsc --noEmit --pretty false` and `just lint` on the touched files.

**Return** ≤ 300 words: exported signatures, the templates (vertex counts, hull sizes, piece counts), the chosen scale constant, test counts and the observed failures. Write bulky output to `docs/reviews/collision-playground/cp8-notes.md`.
