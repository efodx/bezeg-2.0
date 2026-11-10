# F1 solids task 01 handoff (worker)

Status: complete. Files: src/solids/{solid,section,volume}.ts and .test.ts (new only).
Checks: just unit src/solids passes (46 tests); tsc clean outside trig/kinematics; just lint src/solids passes.

Design: Int32Array vertices = grid 1/4 units, Float64Array = real units (clip output, cut points in real units).
sectionConvex returns points (vertex points by index, then edge cuts), loop (oriented so Newell . n > 0),
segments, edgeCuts, coplanarFace. Chain walk over deduped face segments; no angles.

Mutations (all restored, section.ts identical to original):
- cut edge when a sign is 0 (<=0): 13 tests fail (SV1 counts, clip, all-normals, SV2).
- zero vertices keyed by coordinate: SURVIVES. Equivalent mutant on welded meshes (distinct vertices
  have distinct coordinates); no valid closed convex mesh with coincident indices found.
- angle sort: survives all convex tests; killed by the U-prism cases (concave section, 2 failures).

Spec issues (spec not edited):
- 3x+4y+5z=6 has component 5, outside the -4..4 range: kernel rejects it; oracle gives 1.29636.
- 2x+3y+4z=4 passes through vertex (0,0,1): 5 sides = 4 edge cuts + 1 vertex, not 5 edge cuts.
- x+y=1 (rectangle) goes through four vertices: 0 edge cuts.
Repair: 3,4,5 test replaced by (2,3,4) d=4.5 (hexagon, oracle area printed in report); contract comment added; pentagon renamed.
