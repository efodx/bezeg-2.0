# Solids and volumes (Telesa in prostornine)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/solids](../tasks/solids/README.md). Decisions 1–3: [ADR 0051](../adr/0051-solids-mesh-in-surface-view-integer-clipping-and-kgon-revolve.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #8 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md)); the owner rule "extend the existing 3D surface view (`SceneMesh`, patches) rather than adding a renderer, measured first" is settled; the rest are proposals for owner review.
**Source:** the research note's entry 8 (opening lesson, lessons, engine, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.7 *Geometrijski liki in telesa* (page 14; *Geometrijska telesa: prizma, valj, piramida, stožec, krogla*, *Površina in prostornina pokončne prizme, valja, piramide, stožca in krogle*, *Cavalierijevo pravilo*, *Poševna telesa*, *Vrtenine*; objectives "opiše geometrijsko telo", "določi os vrtenja in analizira nastalo vrtenino glede na izbiro osi", "rešuje probleme v povezavi s prostornino rotacijskih teles") and §4.14 *Integralski račun* (TOC page 21; the line "Uporaba določenega integrala (ploščine, prostornine vrtenin ...)" stands after the page-21 footer in the extraction, so it may be on page 22; cited as 21–22). Level markers (VR) not verified. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg draws curves, patches and one 3D surface view, but no solid. The matura asks learners to describe solids, use Cavalieri's principle, compute volumes of oblique solids and of solids of revolution (§4.7, §4.14). The existing integral lessons stay in the plane: Riemann sums of an area (`src/analysis/riemann.ts`). Nothing lets a learner slide a plane through a cube and watch a triangle become a hexagon, see why two stacks of equal slices have equal volume, or turn \(f\) around the axis and read \(\pi\int f^2\) as a stack of discs.

## Solution

Add a Learn chapter **Telesa in prostornine / Solids and volumes** with five guided activities, each backed by a Demonstration for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** (its construction establishes the claim) or an **illustration**.

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/solids/` (below) with oracle tests; ADRs 1–3 accepted; 3D mesh measurement recorded | Kernel tests pass; measurement shows the surface view handles the largest solid mesh |
| A | SV1 Sections of the cube; SV2 Sections of prisms and pyramids | Batch 0 done; Controls step 5; passes the batch gate |
| B | SV3 Cavalieri's principle; SV4 Volumes of pyramid and cone | Batch A released |
| C | SV5 Solids of revolution as \(\pi\int f^2\) | Batch B released; ADR 3 accepted |

Publish batches separately. Do not expose unimplemented Demonstrations. "Surface nets" from the research note is not a lesson here (Out of Scope).

### Reuse and new modules

Verified by search in `src/`:

- The 3D view: `SceneMesh` (`positions`, triangle `faces`, `chordTolerance`) at `src/graphs/patches/surface-view/surfaceScene.ts:40`; `SceneMeshOwner` (54; kinds `tensor`, `triangular`, `join`, `teapot`); `ScenePlane` (a translucent quad seen from both sides, 35, the tangent plane); `SurfaceScene` (85, with `polylines`, `points`, `markers`, `labels`, `camera`); painter's-order sorting `orderBackToFront` (`jsxDepthOrder.ts`, up to 65 535 drawables on the fast path); camera presets `src/graphs/patches/surface-view/surfaceMath.ts`; renderer `jsxSurfaceView.ts`; test double `src/graphs/patches/FakeSurfaceView.ts`; host graph class `BaseSurfaceGraph` (`src/graphs/patches/BaseSurfaceGraph.tsx:50`), example subclass `CoonsPatchGraph`. These are extended, not replaced; `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` are not edited.
- Disc and slice sums: `src/analysis/riemann.ts` (`SUM_METHODS`, `N_MAX = 150`) and `riemannModel.ts`; quadrature `src/analysis/quadrature.ts`. SV5 reuses the midpoint rule on \(\pi f^2\) and does not re-teach Riemann sums.
- No solid, section or revolve code: searched `section`, `revolve`, `frustum`, `Cavalieri`, `prism`, `pyramid` in `src/` (only unrelated hits; no kernel).

New modules (names suggested): `src/solids/solid.ts` (closed convex and general mesh type, builders `cube`, `prism`, `pyramid`, `cone`), `src/solids/section.ts` (plane clipping), `src/solids/revolve.ts`, `src/solids/volume.ts` (signed tetrahedra, analytic volumes), `src/solids/solidsModel.ts` (state parse/validation), graph `src/graphs/solids/SolidsGraph.tsx` (a `BaseSurfaceGraph` subclass, modes `section`, `stack`, `volume`, `revolve`). `SceneMeshOwner` gains the kind `solid` (a one-word union extension in `surfaceScene.ts`, listed as an owned change, not a shared-control change). Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **How a solid is drawn in the existing view.** (a) Extend `SceneMesh` with solid meshes (opaque, flat shaded per face) and show a cut as "keep one side of the plane, add the cap polygon", plus the existing translucent `ScenePlane`; (b) a new canvas/WebGL renderer, rejected by the owner rule; (c) draw only wireframe polylines (cheap, but no hidden-part cue). Painter's order sorts whole triangles, which is wrong where triangles interpenetrate; keeping one side of the cut avoids interpenetration. Proposal: (a), measured first (Batch 0). Before Batch A.
2. **Plane clipping policy.** (a) Solid vertices on an integer grid (units of \(1/4\), coordinates \(-12\ldots12\)), the plane \(n\cdot x=d\) with integer \(n\) (components \(-4\ldots4\)) and integer \(d\) in the same \(1/4\) units as the vertex coordinates (the offset \(1{,}25\) of the examples is \(d=5\) for a cube of side 4 units, so the sign tests stay integer); each vertex gets the exact integer sign of \(n\cdot v-d\); an edge is cut only when its endpoint signs are strictly opposite; vertices with sign 0 are kept once (by index, never by coordinate comparison); (b) doubles with an epsilon; (c) exact rational arithmetic with `BigInt`. Proposal: (a): all discrete decisions (which edges are cut, how many vertices, whether a face lies in the plane) are exact integer tests; only the coordinates of the cut points are doubles. Before Batch A.
3. **Revolve and volume accuracy.** (a) A revolved profile becomes an inscribed \(k\)-gon mesh (\(k=48\)); every volume shown for it is labelled "mesh" next to the exact formula; (b) a higher \(k\) hidden from the learner; (c) analytic surfaces rendered smooth. Proposal: (a), with the factor \(\tfrac{k}{2\pi}\sin\tfrac{2\pi}{k}\) \(=0{,}99715\) for \(k=48\) shown in the test, not in the lesson. Before Batch C.

## Solids kernel (owned by this spec)

1. **Mesh.** `Solid = {vertices: Int32Array grid coords (units 1/4) | Float64Array, faces: number[][] (polygons, outward CCW), }` converted to triangles for `SceneMesh`. `isClosed(solid)` (every edge used by exactly two faces in opposite directions) and `isConvex` are tested, not assumed.
2. **Section.** `sectionConvex(solid, n, d)` for a convex solid on the integer grid returns `{kind: 'empty'} | {kind: 'point', v} | {kind: 'segment'} | {kind: 'polygon', loop: number[] (cut-point ids in boundary order), coplanarFace?: number}`. The loop is built by walking the cut segment each face contributes and chaining them through shared edges, never by sorting angles. `clipSolid(solid, n, d, keep: 'below' | 'above')` returns the kept mesh (clipped faces plus the cap) and is closed again. Non-convex solids are out of scope for section (the cap would need triangulation of non-convex loops).
3. **Revolve.** `revolve(profile: [x, r][], k, axis)` returns a closed mesh (axis points are not duplicated; a profile point on the axis gives an apex).
4. **Volume.** `meshVolume(solid)` by signed tetrahedra; analytic `prismVolume`, `pyramidVolume`, `coneVolume`, `sphereVolume`, `discVolume(f, a, b, n, rule)`.
5. **Verification helpers.** `sectionAreaFromLoop` (Newell vector, independent of the plane normal used for clipping); `sliceAreaAt(solid, height)` for Cavalieri.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node` (scripts and outputs are in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-randomness-solids.md`); none is guessed.

### SV1. Sections of the cube

- Learning goal: a plane cuts a solid in a polygon whose corners are the points where the plane meets the edges; a cube can be cut in a triangle, quadrilateral, pentagon or hexagon, never a heptagon, because the cube has six faces and each contributes at most one side.
- Prerequisites: plane figures; the follow-up is SV2.
- Default example (*checked*), unit cube, plane \(x+y+z=d\): \(d=0.5\): triangle, area \(0{,}21651\); \(d=1\): triangle through three vertices, area \(\sqrt3/2=0{,}86603\) (side \(\sqrt2\)); \(d=1{,}25\): hexagon, area \(1{,}19078\); \(d=1{,}5\): regular hexagon with side \(\sqrt2/2\), area \(\tfrac{3\sqrt3}{2}\cdot\tfrac12=1{,}29904\), the largest of this family; \(d=2{,}5\): triangle, area \(0{,}21651\); \(d=3\): one point. Other planes: \(z=0{,}5\): square, area 1; \(x+y=1\): rectangle \(\sqrt2\times1\), area \(1{,}41421\) (through four vertices; no edge is cut); \(1x+2y+2z=1{,}5\): quadrilateral, area \(0{,}75\); \(2x+3y+4z=4\): pentagon, area \(1{,}23410\) (four edge cuts plus the vertex \((0,0,1)\)); \(2x+3y+4z=4{,}5\): hexagon, area \(1{,}29020\). (Corrected at F1, 2026-11-10: the earlier hexagon example \(3x+4y+5z=6\) had a normal component outside the preset range \(-4..4\).) The volume on the lower side of \(x+y+z=1{,}5\) is \(1/2\); of \(x+y+z=1\) it is \(1/6\).
- Steps: (1) the cube with a plane parallel to a face; predict the shape; (2) tilt the plane (preset normals); (3) slide the plane along \((1,1,1)\) and predict the shape at \(d=1{,}5\); (4) corners of the polygon are marked on the edges they lie on; (5) predict the largest side count, then try to find a heptagon (**argument**: six faces, one side each); (6) free exploration.
- Graph needs: a cube in the surface view with a translucent plane, the kept half plus a cap, drag of \(d\) by a slider (step \(1/4\)) with keyboard, a normal chooser (presets plus integer components \(-4\ldots4\)), readouts of side count, area and the kept volume, camera presets, touch rotation as the existing view, a text status per corner.
- Acceptance:
  1. All the numbers above are reproduced from the kernel, with area from `sectionAreaFromLoop`.
  2. Vertex count and kind (triangle at \(d=1\) with the plane through three vertices; no duplicate point) come from the integer signs; at \(d=1\) the loop has three vertices and the plane through the vertices does not produce degenerate sides.
  3. A plane containing a face (`n=(0,0,1)`, `d=0`) reports `coplanarFace` and not an empty or degenerate polygon.
  4. The clipped cube plus cap is closed (`isClosed`) and its `meshVolume` equals the analytic half-space volume to \(10^{-12}\).
  5. Argument or illustration: step (5) is an **argument** (the cube's face count); the shapes are **illustrations** of one family of planes.
  6. Reset, Preset, restore, both languages pass.

### SV2. Sections of prisms and pyramids

- Learning goal: a section parallel to the base of a pyramid is similar to the base, scaled by \((H-z)/H\), area by its square; a section through the apex is a triangle; a prism's parallel section is congruent to its base.
- Default example (*checked*): square pyramid, base side 4, height 4, apex above the centre: at height \(z=1\) the section is a square of side 3, area 9; at \(z=2\) side 2, area 4; the section through the axis and parallel to an edge of the base is a triangle of area 8; volume \(64/3=21{,}333\).
- Steps: (1) a prism, slide a horizontal plane, the area stays; predict for the pyramid; (2) the pyramid, area shrinks; (3) read the scaling: half the height gives a quarter of the area (**argument** via similar triangles in the axial section, drawn alongside); (4) a plane through the apex gives a triangle; (5) a tilted plane gives up to a pentagon (the pyramid has five faces); (6) free exploration.
- Acceptance: (1) numbers reproduced; (2) area ratio \(=(1-z/4)^2\) at every grid height; (3) all sections of the pyramid have at most 5 sides (test over all nonzero integer normals with components in \(-4\ldots4\), the full range the control allows, and all offsets); (4) the pyramid mesh is closed, convex, outward; (5) similarity is shown, not asserted: the axial triangle is drawn; (6) both languages pass.

### SV3. Cavalieri's principle

- Learning goal: two solids between the same planes whose sections at every height have equal area have equal volume; a shear changes the shape but not the volume.
- Default example (*checked*): square prism, base \(2\times2\), height 3, volume 12; the same prism sheared sideways by 1,5 has the same slice area 4 at every height and the same volume 12. Two stacks of 12 coins (cylinders) straight and slanted: the same.
- Steps: (1) a stack of thin slabs; predict the volume of the slanted stack; (2) shear slider (grid \(1/4\)): slab outlines slide, areas readout stays; (3) slice-by-slice comparison at the cursor height (an **illustration**: it samples one height; the **argument** is that the shear maps every horizontal slice to a congruent translate of itself, so all slice areas are equal, which is the principle's hypothesis); (4) a pair that fails (a cone and a cylinder): the areas differ, no conclusion; (5) free exploration.
- Acceptance: (1) volumes by `meshVolume` agree between the straight and sheared mesh to \(10^{-12}\), as an independent check; (2) `sliceAreaAt` is equal for both at 100 heights; (3) the prose states the principle as a hypothesis and a conclusion, and the failing pair shows that unequal areas allow no conclusion either way; (4) the shear is an exact integer-grid transform; (5) both languages pass.

### SV4. Volumes of the pyramid and the cone

- Learning goal: \(V=\tfrac13Bh\); a cube divides into three congruent pyramids; the cone follows by Cavalieri and slicing.
- Default example (*checked*): the unit cube cut into three pyramids with common apex \((1,1,1)\) and bases the faces \(x=0\), \(y=0\), \(z=0\), each of volume \(1/3\) (sum 1). Cone \(r=3\), \(h=4\): \(V=12\pi=37{,}699\); the sum of 4 midpoint discs gives \(37{,}110\), of 10 gives \(37{,}605\), of 100 gives \(37{,}698\).
- Steps: (1) the cube; predict how many equal pyramids fill it; (2) split into three; (3) one pyramid has volume \(1/3\) of the prism over its base (**argument** for the unit cube; the general square pyramid follows by similarity); (4) the cone as a stack of discs of radius \(3z/4\), the disc sum converges; (5) free exploration.
- Acceptance: (1) three pyramid meshes tile the cube: sum of `meshVolume` is 1; (2) disc sums agree with the quoted values, with the midpoint rule from `riemann.ts` semantics; (3) the "\(1/3\)" is derived for the cube and stated as extended by Cavalieri for other bases; (4) both languages pass.

### SV5. Solids of revolution as \(\pi\int f^2\)

- Learning goal: rotating the graph of \(f\) about the \(x\)-axis gives a stack of discs of radius \(f(x)\); the volume is \(\pi\int_a^b f^2\,dx\); the axis choice changes the solid (§4.7 "določi os vrtenja").
- Default example (*checked*): \(f=\sqrt x\) on \([0,4]\) gives \(8\pi=25{,}1327\) (the midpoint sum of \(\pi x\) is exact; the \(k=48\) mesh of the 8-segment profile has volume \(24{,}8629\), \(1{,}1\,\%\) low); \(f=x^2\) on \([0,1]\) gives \(\pi/5=0{,}62832\) (5 midpoint discs: \(0{,}60752\)); a cone \(f=3x/4\) on \([0,4]\) gives \(12\pi\); a sphere \(f=\sqrt{9-x^2}\) on \([-3,3]\) gives \(36\pi=113{,}097\) (6 discs: \(114{,}668\); 60 discs: \(113{,}113\)).
- Steps: (1) the graph of \(f\) and the axis; predict the solid; (2) rotate the curve in the 3D view; (3) cut it into discs, each of area \(\pi f(x)^2\), drag the number of discs (up to 60); (4) the exact integral beside the sum; (5) rotate \(f=x^2\) on \([0,1]\) about the \(y\)-axis instead (the solid differs); the readout is the washer integral \(\pi\int_0^1(1-y)\,dy=\pi/2=1{,}5708\) (equivalently shells \(2\pi\int_0^1 x\cdot x^2\,dx\)), against \(\pi/5=0{,}6283\) about the \(x\)-axis; (6) free exploration.
- Acceptance: (1) numbers reproduced, the mesh volume equals the profile frustum sum times \(\tfrac{k}{2\pi}\sin\tfrac{2\pi}{k}\) to \(10^{-12}\); (2) the revolved mesh is closed; (3) the mesh volume is labelled as the mesh's; (4) the profile is limited to a polyline with at most 64 vertices and \(f\) is evaluated at the grid, no function parser; (5) both languages pass.

## User Stories

1. As a learner I slide a plane through a cube and discover the pentagon and the hexagon before I am told they exist.
2. As a learner I shear a prism and see the volume stay.
3. As an educator I project a revolved solid and cut it into discs to introduce \(\pi\int f^2\).
4. As a learner on a phone I rotate with the existing camera gesture and read the section's side count as text.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| Slovenian | English | Where | Reason |
| --- | --- | --- | --- |
| ravninski presek | plane section | SV1, SV2 | standard school term ("presek telesa z ravnino"), source not opened |
| Cavalierijevo pravilo | Cavalieri's principle | SV3 | the exact wording of §4.7 of the matura catalogue |
| poševno telo | oblique solid | SV3 | §4.7 "Poševna telesa" |
| vrtenina; os vrtenja | solid of revolution; axis of rotation | SV5 | §4.7 "Vrtenine", "os vrtenja" |
| prostornina vrtenine | volume of revolution | SV5 | §4.14 "prostornine vrtenin" |
| piramida, stožec, valj, prizma | pyramid, cone, cylinder, prism | all | §4.7 |
| mrežno telo | meshed solid (mesh) | readouts | proposal only; avoid in the lesson text |

Neighbouring terms reused from the app: 3D view labels in `src/localization/sl.ts` (search "tangentna ravnina", "površina") are reused as is. No FMF or textbook source was opened.

## Implementation Decisions

- Gating (per the stream's [boundary with the Controls stream](../tasks/feature-streams/families-prep.md)). **Ungated now:** this spec; F0 plan and ADRs 1–3; F1 kernels `src/solids/` as new pure TypeScript with oracle tests; a mesh-size measurement as a benchmark script. **Waits on Controls step 5 and on the performance measurement:** the graph (F2a): sliders for plane offset and shear, preset chooser, status readouts. The one edit in existing code is the `SceneMeshOwner` kind `solid` in `surfaceScene.ts`, assigned to this family; no edit to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels. Dependencies on the owning streams: an integer slider with keyboard stepping, a preset chooser, and a text status per vertex.
- Measurement first (owner rule), per [the performance plan](../performance-plan.md): frame time while dragging the plane offset on a cube (12 triangles plus cap), a 48-segment revolve (about 770 triangles, as in the note), a 200-triangle stack of slabs, on desktop and a phone; the painter's-order sort on 65 535 drawables; result decides if one `SceneMesh` carries a solid or a slab stack must be merged.
- State: solid choice, plane normal, offset, shear, disc count, camera; serialised in the preset; import validates the grid ranges.
- Breaking changes: none (new routes and presets, one added union member).
- F2a decisions (handler, 2026-11-11):
  - The measurement before the graph is compute-only with a jsdom placeholder for the view update (ADR 0051 §1, "Measurement results"), as for phase portraits: no route exists for a browser run. Compute stays far inside 16 ms in all three cases, so §1 stands; browser frame times on a desktop and a phone are owed at F2b, and the slab-stack merge remains the fallback.
  - State adds the revolve axis (`x` or `y`, default `x`), because SV5 step 5 rotates \(f=x^2\) about the \(y\)-axis.
  - Stack mode holds two pairs: the straight and sheared square prism, and SV3's failing pair (a cone and a cylinder of equal height), whose readout states that no conclusion follows. The y-axis solid of SV5 step 5 touches itself at one point (the bowl tip on the bottom disc centre); that is the true shape, not a mesh defect.
  - Typed off-grid plane offset and shear are rounded to the \(1/4\) grid with a hint that says so; integer fields (normal, discs) refuse off-grid values.
  - Review repairs: the mesh-volume note no longer states a direction, because chord profiles (parabola) give a mesh volume above the exact one; only the cone and cylinder note says "below". Controls that do not apply (shear for the failing pair, axis for the sphere) show a reason. The live text announces the axis. Slovenian counts are phrased count-neutrally.
  - Sections are offered for the four convex grid solids (cube, triangular prism, square prism, square pyramid); the model rejects section mode with any other solid.

## Testing Decisions

- Section: for every nonzero integer normal in \(\{-4..4\}^3\) and every offset, the side count is at most the face count and the loop is a simple closed chain (each cut point used twice). Independent area oracle, sharing no algorithm with the clipper: section area \(=|n|\cdot dV/dd\), where \(V(d)\) is the half-space volume (inclusion–exclusion for the cube, a finite difference of the exact piecewise polynomial); it reproduces \(0{,}21651\), \(1{,}19078\), \(0{,}75\), \(1{,}23410\), \(1{,}29020\) of SV1 and side counts 4, 5, 6 (the pentagon is four edge cuts plus a vertex; reproduced by the F1 kernel tests); the Newell area of the loop is then checked against it, and the cap area of the clipped mesh against both.
- `clipSolid` closed and `meshVolume` equals the analytic half-space volume for the cube (values \(1/6\), \(0{,}3177083\) at \(d=1{,}25\), \(1/2\)); the kept-below plus kept-above volumes sum to the solid's.
- Builders: `meshVolume` of cube, prism, pyramid, cone mesh against formulas (cone with the \(k\)-gon factor).
- Revolve: mesh volume equals the frustum sum times the \(k\)-gon factor; a profile touching the axis produces an apex and a closed mesh.
- Graph: scene builds without NaN (`assertFiniteScene`), Reset/Preset/restore, both languages, keyboard, text status; renderer test double `FakeSurfaceView`.

### Batch-wide acceptance gate

A batch ships only when: kernel tests pass; every quoted number is reproduced by a test; every drawn solid mesh passes `isClosed`; each section view agrees with the exact integer sign decision; the measurement from the performance plan is recorded and within budget on desktop and a phone; section side counts and areas are available as text; the lesson prose test (`lessonMathNotation.test.ts`) and `npx tsc --noEmit` pass; and a smoke test of the new routes is done.

## Correctness Notes

- Every discrete decision about a section (which edges are cut, vertex count, plane through a vertex, coplanar face) is an exact integer sign on grid inputs (ADR 2); no tolerance stands in for these tests. The cut points' coordinates are doubles labelled computed.
- Sections are drawn for convex solids only. A cap of a non-convex clipped solid could be several loops.
- The \(k\)-gon factor \(\tfrac{k}{2\pi}\sin\tfrac{2\pi}{k}\) always lowers a revolved volume, but the profile polyline can err either way (low for concave profiles such as \(\sqrt x\), high for convex ones such as \(x^2\)); the lesson text shows the exact value next to the mesh volume. Midpoint disc sums err either way too (for the sphere, 6 discs give \(114{,}668\) against \(113{,}097\), above; for \(x^2\) on \([0,1]\), 5 discs give \(0{,}6075\), below) and are labelled approximations.
- Painter's order draws whole triangles back to front; interpenetrating solids would look wrong, so the view never shows two solids that cross (SV3 slabs are disjoint).

## Out of Scope

Surface nets and isosurfaces (the research note's fifth lesson: a separate decision after the measurement), non-convex sections, boolean operations, a new renderer, smooth shading and lighting beyond per-face flat shading, surface-area lessons, spheres as meshes beyond the revolve, learner-defined functions (no parser).

## Further Notes

Not verified: VR markers; the Slovenian terms; whether the surface view handles the stack of slabs and the 48-segment revolve at acceptable frame times on phones (not measured; the decision of ADR 1 depends on it); whether flat shading separates the faces enough without lighting in the existing view; the exact page of the §4.14 line. The circle-geometry and probability-statistics specs were not read.
