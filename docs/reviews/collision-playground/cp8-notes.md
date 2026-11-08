# CP8 notes

Templates (vertices / hull / pieces / triangles): L 6/5/2/4, U 8/4/3/6, chevron 6/3/2/4, dart 4/3/2/2, star 8/4/4/6, comb 12/4/6/10, hexagon 6/6/1/4. Mean area 19.43; scale 10.15 at n=10, 1.015 at n=1000.

Tests: collisions 83 (new file polygonModel.test.ts), src/compgeo 731, playground/collisions 67; tsc and lint clean.

Mutations seen failing (polygonModel.test.ts): reflex diagonal kept (strictlyConvex check removed) -> piece convexity, notch and integer-SAT grid tests; touching treated as separated (<=) -> shared edge, shared vertex, vertex-on-edge, notch, grid; skipped first edge normal -> grid and world agreement tests; hull vertex dropped -> hull-containment, vertex-on-edge, world agreement.
Reduced coverage: n=200 direct all-pairs check every 60th step, n=1000 only seeds 1-2 (cost); broad-phase agreement runs every step.
