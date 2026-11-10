# 01 Mesh and section kernel (F1, Batch 0)

Spec: [solids kernel](../../specs/solids-volumes-lessons.md#solids-kernel-owned-by-this-spec) items 1–2, and the area and volume helpers of item 4 (`meshVolume`) and item 5 (`sectionAreaFromLoop`) that the section tests need; SV1–SV2 checked numbers; Testing Decisions (section, clip); Correctness Notes. Decisions: ADR 0051 §2.

Scope: new `src/solids/solid.ts` (mesh type, `isClosed`, `isConvex`, builders `cube`, `prism`, `pyramid`, conversion to triangles), `src/solids/section.ts` (`sectionConvex`, `clipSolid`) and `src/solids/volume.ts` (`meshVolume` by signed tetrahedra, `sectionAreaFromLoop` by the Newell vector), with their test files. Edit no existing file. In particular, `surfaceScene.ts` is not edited in F1.

Acceptance:

1. The builders produce closed meshes with outward counter-clockwise faces. `isClosed` and `isConvex` are tested on positive and negative cases, including a mesh with one flipped face.
2. `sectionConvex` returns `empty`, `point`, `segment` or `polygon` from exact integer signs. Its loop is built by chaining through shared edges, not by sorting angles, and a coplanar face is reported. Over every nonzero integer normal in \(\{-4..4\}^3\) and every offset for the cube, the side count is at most the face count and the loop is a simple closed chain in which each cut point is used twice.
3. Section areas match an independent oracle, \(|n|\cdot dV/dd\) from the exact piecewise-polynomial half-space volume of the cube, which shares no algorithm with the clipper. The SV1 values \(0{,}21651\), \(1{,}19078\), \(0{,}75\), \(1{,}23410\) and \(1{,}29636\) and the edge-cut counts 4, 5 and 6 are reproduced. The Newell area of the loop and the cap area of the clipped mesh agree with the oracle.
4. `clipSolid` returns a closed mesh. Its `meshVolume` equals the analytic half-space volume of the cube: \(1/6\), \(0{,}3177083\) at \(d=1{,}25\), and \(1/2\). The kept-below and kept-above volumes sum to the solid's. The SV2 numbers match.
5. No \(\varepsilon\) appears in any discrete section decision. Off-grid vertices and normals or offsets out of range are rejected.

Checks: `just unit src/solids`, then `npx tsc --noEmit --pretty false` and `just lint src/solids`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: an edge cut also when one endpoint sign is 0, a sign-0 vertex deduplicated by coordinate instead of index, and the loop built by angle sorting. If the angle-sort mutation survives on convex sections, say why and add a case that kills it (a coplanar face or a plane through a vertex). If a spec number does not reproduce, do not edit the spec; report the value you get.
