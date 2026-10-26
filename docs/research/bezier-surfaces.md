# Bézier surfaces as a learning family

Research date: 2026-10-26. This page gathers sources and teaching options for a future Bézier surface family. It is not a spec or a migration decision. Mathematical statements come from standard CAGD textbooks, cited by bibliographic reference because their chapter numbering differs between editions. Library statements come from official JSXGraph and three.js documentation, the JSXGraph CHANGELOG and the published 1.9.2 package source. The app's internal architecture is out of scope here.

## Summary

- Tensor-product Bézier patches extend the curve material directly. Every iso-parameter line and every boundary is a Bézier curve, and evaluation is the curve de Casteljau algorithm applied twice. The chapter can therefore begin with "a surface is a curve of curves" and reuse what students already know about curves (Farin; Prautzsch–Boehm–Paluszny).
- Several curve properties survive: convex hull, affine invariance, corner interpolation and endpoint tangents. Variation diminishing does not survive in any general form. Learners should be told this explicitly (Farin).
- Triangular Bézier patches are a different construction, not a special case of tensor patches: they use barycentric coordinates, a triangular control net and a three-way de Casteljau step. They make a good closing comparison lesson (Farin 1986).
- The bilinear patch (degree (1,1)) is the smallest useful object. Its four corners already show a hyperbolic paraboloid, ruled lines and the twist. A bicubic patch, and finally the 32-patch Utah teapot, make a strong historical finale.
- The installed **JSXGraph 1.9.2** has a 3D view with parallel or central projection, a trackball, keyboard az/el/bank control and draggable `point3d`. Its surfaces are wireframe-only and only points are depth-sorted. Filled, shaded surfaces with face depth ordering need **JSXGraph ≥ 1.11** (`polyhedron3d`), and **≥ 1.13** to render `surface3d` as a shaded polyhedron. three.js offers better shading and performance, but Bezeg would then have to build 3D dragging, labels and LaTeX itself.

## 1. Mathematical content (learning progression)

Notation follows Farin. $B_i^m(u)=\binom{m}{i}u^i(1-u)^{m-i}$ are the Bernstein polynomials already taught in the curve chapters.

### 1.1 Tensor-product Bézier patch

- **Definition.** For a control net $b_{ij}$ with $0\le i\le m$ and $0\le j\le n$:
  $x(u,v)=\sum_i\sum_j b_{ij}\,B_i^m(u)\,B_j^n(v)$ on $[0,1]^2$. The degree is $(m,n)$ and the net has $(m+1)(n+1)$ points (Farin, tensor-product Bézier surfaces chapter; Prautzsch–Boehm–Paluszny, ch. on tensor-product surfaces; Hoschek–Lasser).
- **"Tensor product" means product of basis functions**, not product of two curves' points. The patch is the surface swept by a Bézier curve whose control points themselves move along Bézier curves. This sweep reading is the key bridge from curves (Farin; Bézier 1972).
- **Bernstein products.** The basis functions $B_i^m(u)B_j^n(v)$ are non-negative and sum to 1 (a partition of unity), because each factor family does (Farin).
- **Ladder of examples:**
  - **Bilinear, (1,1):** four corner points, $x=(1-u)(1-v)b_{00}+u(1-v)b_{10}+(1-u)v\,b_{01}+uv\,b_{11}$. When the four corners are not coplanar, the surface is a hyperbolic paraboloid. Both families of iso-lines are straight, so the surface is doubly ruled (Farin; Hoschek–Lasser).
  - **Biquadratic, (2,2):** 9 points. Only the centre point is not on the boundary, which makes it the simplest "pull the middle" demo.
  - **Bicubic, (3,3):** 16 points: 4 corners, 8 edge-tangent points and 4 interior "twist" points. This is the industry and teapot workhorse (Farin; Newell 1975).
  - **Mixed degree (m≠n),** for example (3,1): a ruled surface between two cubic boundary curves. It shows that the degree is a pair.

### 1.2 Evaluation by de Casteljau

- **Two-stage (row-then-column).** Run the univariate de Casteljau algorithm on each of the $n+1$ rows, the $u$-direction curves with control points $b_{0j},\dots,b_{mj}$. This gives $n+1$ intermediate points $c_j(u)$. A final de Casteljau run on those points at $v$ gives $x(u,v)$. Columns first gives the same result (Farin; Prautzsch–Boehm–Paluszny).
- **Geometric reading.** The points $c_j(u)$ are the control polygon of the iso-curve $x(u,\cdot)$. Students see that iso-curve control points generally lie *off* the net (Farin).
- **Direct (bilinear) de Casteljau.** Repeatedly replace each 2×2 cell by its bilinear interpolant at $(u,v)$:
  $b^{r}_{ij}=\sum_{k,l\in\{0,1\}} B_k^1(u)B_l^1(v)\,b^{r-1}_{i+k,j+l}$.
  For $m=n$ this reaches a single point after $n$ steps. For $m\ne n$, do $\min(m,n)$ bilinear steps and finish with univariate steps (Farin). This variant parallels the triangular algorithm and gives "pyramids of nets" visuals.
- **Cost note.** Two-stage evaluation is cheaper in general. The direct variant is mainly of conceptual interest (Farin).

### 1.3 Properties

| Property | Holds? | Teaching note |
|---|---|---|
| Affine invariance | Yes (partition of unity) | Transform the net and evaluate, or evaluate and transform: same result. |
| Convex hull | Yes, for $u,v\in[0,1]$ | The hull of the *whole* net, not of each row. |
| Corner interpolation | Yes: $x(0,0)=b_{00}$, etc. | Only the 4 corners. Interior and edge points are not interpolated. |
| Boundary curves | Bézier curves of degree $m$ or $n$, defined by the boundary rows and columns of the net | Direct link to the curve family. |
| Iso-curves | $u=\text{const}$ gives a degree-$n$ Bézier curve in $v$, and vice versa | Their control points come from de Casteljau on the columns. |
| Diagonal $x(t,t)$ | Bézier curve of degree $m+n$ | Surprising: the degree adds. |
| Variation diminishing | No general analogue | Farin notes that no useful bivariate version exists. Do not claim one. |
| Symmetry | Reversing the $i$ or $j$ index order reparametrises $u\to1-u$ or $v\to1-v$ | |

Sources: Farin; Prautzsch–Boehm–Paluszny; Hoschek–Lasser.

### 1.4 Derivatives, tangent plane, normals, twist

- **Partial derivatives** are again tensor Bézier patches of degree $(m-1,n)$ built from forward differences:
  $x_u=m\sum_{i=0}^{m-1}\sum_j (b_{i+1,j}-b_{ij})B_i^{m-1}(u)B_j^n(v)$, and similarly for $x_v$ (Farin).
- **At corners,** $x_u(0,0)=m(b_{10}-b_{00})$ and $x_v(0,0)=n(b_{01}-b_{00})$. The tangent plane at a corner is spanned by the two adjacent net edges, which mirrors the curve endpoint-tangent property.
- **Inside the patch,** the last two-stage de Casteljau level gives the tangent plane: the final 2×2 bilinear cell spans it (Farin).
- **Normal:** $N=x_u\times x_v/\lVert x_u\times x_v\rVert$. It is undefined where $x_u\parallel x_v$, for example at the poles of patches with a collapsed (degenerate) edge (Farin; Piegl–Tiller).
- **Twist** $x_{uv}$: at a corner, $x_{uv}(0,0)=mn\,(b_{11}-b_{10}-b_{01}+b_{00})$. It is zero exactly when the corner cell is a parallelogram (Farin). Interactive demo: drag $b_{11}$ out of the plane and watch the twist vector grow.

### 1.5 Degree elevation and subdivision

- **Degree elevation** is applied in one direction at a time. Elevating $u$ from $m$ to $m+1$ applies the curve formula to every row:
  $b^{(1)}_{ij}=\tfrac{i}{m+1}b_{i-1,j}+\left(1-\tfrac{i}{m+1}\right)b_{ij}$.
  Because the surface does not change, elevated nets converge to it under repetition (Farin; Prautzsch–Boehm–Paluszny).
- **Subdivision** at $u=c$ runs curve subdivision (the de Casteljau triangle edges) on every row and yields two patches. The $v$ direction works the same way, and doing both gives four patches. Repeated subdivision makes the nets converge to the surface. This is the basis for rendering and intersection algorithms (Farin; Lane–Riesenfeld style arguments in Prautzsch–Boehm–Paluszny).

### 1.6 Continuity between patches

Two patches with nets $b_{ij}$ and $c_{ij}$ meet along $u=1$ of the first and $u=0$ of the second (Farin; Hoschek–Lasser):

- **C0:** the shared boundary rows are equal, $b_{m j}=c_{0j}$ for all $j$.
- **C1** (equal parameter interval lengths): for every $j$, $c_{1j}-c_{0j}=b_{mj}-b_{m-1,j}$. Every triple $b_{m-1,j}, b_{mj}=c_{0j}, c_{1j}$ is collinear with the *same* ratio along the whole boundary. With unequal interval lengths the ratio is a constant other than 1.
- **G1** (tangent-plane continuity): the tangent planes agree along the shared boundary. A simple sufficient condition is that every cross-boundary triple is collinear with a constant ratio. The general G1 conditions allow a varying ratio plus a tangential term and are considerably harder. Farin and Hoschek–Lasser treat them, but a lesson only needs the collinearity picture.
- **Twist compatibility** at corners where four patches meet is a classic difficulty: the twist vectors must satisfy compatibility conditions (Farin). This is advanced material and probably optional.

### 1.7 Triangular Bézier patches

- **Domain:** a triangle, with barycentric coordinates $(u,v,w)$, $u+v+w=1$, all non-negative inside the triangle (Farin 1986; Farin textbook).
- **Basis:** $B^n_{ijk}(u,v,w)=\frac{n!}{i!\,j!\,k!}u^iv^jw^k$ with $i+j+k=n$. The net has $\binom{n+2}{2}=(n+1)(n+2)/2$ control points in a triangular array, for example 10 for cubics (Farin 1986).
- **De Casteljau:** $b^r_{ijk}=u\,b^{r-1}_{i+1,j,k}+v\,b^{r-1}_{i,j+1,k}+w\,b^{r-1}_{i,j,k+1}$ with $i+j+k=n-r$. The result is $b^n_{000}$, and the last level spans the tangent plane (Farin 1986).
- **Properties shared with tensor patches:** convex hull, affine invariance, vertex interpolation, and boundary curves that are degree-$n$ Bézier curves.
- **How they differ:**
  - The total degree is $n$, compared with bi-degree $(m,n)$ and total degree $m+n$ for tensor patches.
  - There is no natural "row/column" iso-curve grid. Lines parallel to an edge are Bézier curves, but the three families are not independent parameters.
  - They suit triangulated or irregular topology, and they are not the standard representation in CAD/NURBS pipelines.
  - Degree-$n$ tensor patches are not triangular patches and vice versa. Conversion splits a tensor patch into triangles, or degenerates a triangle into a tensor patch with a collapsed edge (Farin 1986; Hoschek–Lasser).

### 1.8 Rational Bézier surfaces

- **Definition:** add weights $w_{ij}>0$. $x(u,v)=\dfrac{\sum w_{ij}b_{ij}B_i^m B_j^n}{\sum w_{ij}B_i^mB_j^n}$, which is the central projection of a 4D polynomial patch (Farin; Piegl–Tiller).
- **Exact quadrics:**
  - A **cylinder** quarter is rational quadratic (a circular arc with middle weight $\cos 45^\circ=\sqrt2/2$) in $u$ times linear in $v$.
  - A **surface of revolution** is the tensor product of a profile curve and a rational quadratic circular arc.
  - A **sphere** piece is a revolved circular arc, a rational biquadratic patch with a degenerate (collapsed) edge at the pole (Piegl–Tiller, "Construction of common surfaces").
  - An **octant of a sphere** is also exactly a rational quartic *triangular* patch without degeneracy (Farin, Piper & Worsey 1987).
- **Pedagogy:** Bezeg already has rational curves. "Spin a rational circle" is a natural one-lesson bridge to surfaces of revolution.

### 1.9 Example surfaces

- **Ruled surfaces:** degree $(m,1)$ patches, straight lines between two Bézier boundary curves. The bilinear patch is the doubly-ruled special case (Hoschek–Lasser; Farin).
- **Hyperbolic paraboloid:** the bilinear patch with corners $(0,0,0),(1,0,0),(0,1,0),(1,1,1)$ gives $z=uv$. It is the clearest saddle for projection.
- **Surface of revolution:** a rational patch, see §1.8.
- **Coons patches** (Coons 1967) interpolate four given boundary curves. A bilinearly blended Coons patch with Bézier boundaries is itself a tensor Bézier patch whose interior net is determined by the boundary (Farin). This is good enrichment: "from four curves you know to a surface".
- **Utah teapot.** Martin Newell built the model in 1975 at the University of Utah from bicubic Bézier patches and used it in his PhD work (Newell 1975). The original data has **28** bicubic patches without a bottom. The widely circulated set has **32**, adding bottom patches (Crow 1987, "The Origins of the Teapot"; Yuksel, Blinn & Newell 2026, "The Return of the Utah Teapot"). The control points circulated through the DARPA graphics community and later Usenet (ACM SIGGRAPH History Archives). Data sources:
  - three.js `TeapotGeometry`, which credits "the Utah teapot database by Martin Newell" via the SPD (Standard Procedural Databases) software. Its `blinn` option applies the familiar vertical squash: the commonly rendered teapot is shorter than Newell's data.
  - The "Utah Teapot: Artifact, History, Datasets" page by Ian Mallett (geometrian.com) collects variants.

  Check a dataset's licensing before bundling it. Treat this as a provenance task; it was not verified here.

## 2. Classroom lessons

### 2.1 Interactive scenes per concept

| Concept | Scene | What the student does / sees |
|---|---|---|
| Sweep intuition | A curve whose control points slide along other curves | Animate $v$ and watch the moving curve trace the surface. Toggle ghost iso-curves. |
| Bilinear patch | 4 draggable corners, iso-grid | Lift one corner and see the flat square become a saddle. Verify that iso-lines stay straight. |
| Boundary = curve | Highlight one boundary row and its 2D Bézier curve | Edit only the boundary row and notice that the curve chapter's de Casteljau applies directly. |
| Iso-curves | Slider $u$; draw $x(u,\cdot)$ and its control polygon $c_j(u)$ | The control polygon leaves the net. Its points are the row de Casteljau results. |
| Two-stage de Casteljau | Point $(u,v)$ in a 2D parameter square next to the 3D view | Show the row pyramids first, then the column pyramid, and finally the point. Swap the order and get the same point. |
| Direct de Casteljau | Same scene with a "bilinear steps" mode | Shrinking nets, levels coloured by depth. |
| Convex hull / affine invariance | Translucent hull, apply rotation/scale to the net | The surface stays inside the hull. The transformed net gives the transformed surface. |
| Tangent plane & twist | Plane glyph at $(u,v)$; corner twist arrow | Drag $b_{11}$. The twist is zero when the corner cell is a parallelogram. |
| Degree elevation | Button "elevate in u/v" | The net gains rows, the surface is unchanged, and the net creeps towards the surface. |
| Subdivision | Split at $(u,v)$ into 2 or 4 coloured patches | Repeat and see the nets converge. |
| Continuity | Two patches sharing a boundary | Constraint modes C0 → C1 (collinear, equal ratio) → G1 (collinear, constant ratio). A kink or highlight seam shows on violation. |
| Triangular vs tensor | Side-by-side cubic triangle (10 pts) and bicubic (16 pts) | Barycentric slider triangle versus parameter square. Compare boundary curves and de Casteljau steps. |
| Rational | Rational circle revolved | Weight slider. At $\sqrt2/2$ the shape becomes an exact cylinder or sphere, with a deviation readout. |
| Teapot | 32 bicubic patches with patch borders and nets | History, plus "every patch is the 16-point thing you just built". |

### 2.2 Suggested chapter outline

Each lesson ends with a measurable takeaway (MT), something a student can do or check.

1. **From curve to surface (sweep).** MT: explain how a moving Bézier curve traces a patch, and name the degree pair of a given net.
2. **The bilinear patch.** MT: compute $x(\tfrac12,\tfrac12)$ of a bilinear patch by hand, and identify the saddle and its straight lines.
3. **Tensor-product definition and the control net.** MT: count control points for $(m,n)$, verify the partition of unity numerically, and state which net points are interpolated.
4. **Boundary and iso-curves.** MT: given a net, draw the four boundary curves, and construct the control polygon of the iso-curve at a given $u$.
5. **Evaluating with de Casteljau.** MT: carry out two-stage de Casteljau for a biquadratic at given $(u,v)$, and show that the order does not matter.
6. **Properties and non-properties.** MT: predict hull containment, apply an affine map, and produce a counterexample showing that the curve's variation-diminishing intuition fails.
7. **Tangent plane, normal, twist.** MT: compute corner partials and twist from the net, and decide when the twist is zero.
8. **Degree elevation and subdivision.** MT: elevate a bilinear patch to (2,1) by hand, and subdivide at $u=\tfrac12$.
9. **Joining patches.** MT: state and check C0/C1 conditions on two nets, and distinguish C1 from G1.
10. **Triangular and rational patches (comparison and outlook).** MT: count triangular control points, run one barycentric de Casteljau step, and explain why a sphere needs weights. The teapot serves as the capstone.

Lessons 1–5 form a minimal first release. Lessons 6–10 can follow.

### 2.3 Common misconceptions

- **"The surface passes through all control points."** Only the corners are interpolated. (Students carry over the same error from curves; Farin.)
- **"An iso-curve's control points are a row of the net."** This is true only for $u\in\{0,1\}$. Inside, they come from de Casteljau (Farin).
- **"Tensor product = multiply two curves."** The *basis functions* are multiplied, not the point positions.
- **"The patch stays in the hull of each row."** Containment is in the hull of the whole net.
- **"Diagonals have degree n."** $x(t,t)$ has degree $m+n$.
- **"C1 only needs the tangents to line up."** Line-up gives (sufficient) G1. C1 also needs equal ratios along the whole boundary.
- **"Triangular patches are tensor patches with one edge removed."** They have a different basis, a different domain and a total-degree space.
- **"Variation diminishing still holds."** There is no general bivariate analogue (Farin).
- **3D perception errors** cause their own misconceptions: a point that "looks" on the surface in one projection may not be. Mitigate with rotation and preset views (§3).

## 3. Visualising 3D on 2D screens and projectors

Recommendations here are partly design judgement. Cited sources support the perceptual and accessibility basis.

- **Motion gives depth.** Rotation produces the kinetic depth effect: a rotating wireframe is perceived as 3D, while the same static projection is ambiguous (Wallach & O'Connell 1953; Ware 2021). Offer a slow auto-rotate or rocking toggle for projection, and let the teacher stop it.
- **Orbit camera plus fixed presets.** Free orbiting loses orientation, while presets (front/top/side/isometric) give a shared classroom reference ("look at the top view"). JSXGraph View3D supports stepping through stored views with PageUp/PageDown (`values`). three.js OrbitControls offers free orbiting.
- **Parallel vs central projection.** Parallel (orthographic) projection preserves parallelism and ratios along lines, which matters for net geometry and the C1 ratio demo. Central projection gives a stronger depth impression. Default to parallel for teaching constructions, and offer central as a toggle. JSXGraph defaults to `projection: 'parallel'`.
- **Wireframe vs shaded.** Use wireframe or iso-grids to show the parameterisation, which is the actual subject. Shading shows shape and continuity: G1 failure appears as a crease in shading and highlight lines. Use both, with the iso-grid on top of a light shaded fill. Shading with depth sorting needs JSXGraph ≥ 1.11, see §4.
- **Iso-curve grid density.** Use few lines (5–8 per direction) on a projector, and draw the current $u$ and $v$ iso-curves bold.
- **Colour by parameter.** Map $u$ and $v$ to two hues, or a 2D colour map. This links the 3D surface to the 2D parameter square. Ensure colour-blind-safe palettes and redundant cues such as line style, since colour must not be the only carrier of meaning (WCAG 2.2 SC 1.4.1).
- **Linked parameter-domain panel.** A 2D square (or triangle) beside the 3D view, where the student drags $(u,v)$, avoids 3D picking entirely for evaluation lessons. This fits a 2D board library well.
- **Projection-onto-plane alternatives:**
  - Show height-field patches $z=f(x,y)$ (functional Bézier patches with $b_{ij}=(i/m,\,j/n,\,z_{ij})$) as a top view with contour lines.
  - Show three orthographic views (top/front/side), as in engineering drawing.
  - Drag control points in a 2D view, with a separate height slider.
- **3D dragging ambiguity.** A 2D pointer drag has only two degrees of freedom. The standard solution, used by JSXGraph, is to drag in a plane parallel to $xy$ and switch to vertical ($z$) dragging with a modifier key. Without a modifier, touch users need an on-screen toggle or separate $z$ control.
- **Accessibility:**
  - WCAG 2.2 requires keyboard operability (SC 2.1.1) and a single-pointer alternative to dragging (SC 2.5.7 Dragging Movements).
  - Provide arrow-key orbiting, as in the JSXGraph az/el keyboard defaults, and numeric coordinate fields for the selected control point.
  - Provide on-screen orbit/preset buttons for touch.
  - Avoid gestures that need two fingers as the only path. three.js OrbitControls uses two fingers for zoom/pan.

## 4. Rendering and library options

Bezeg pins `jsxgraph: ^1.9.2`. The caret range admits 1.x upgrades, but the lockfile resolves 1.9.2 (see [curve-renderer-options](curve-renderer-options.md)). All version claims below are from the JSXGraph CHANGELOG and the unpkg-published 1.9.2 source.

### 4.1 JSXGraph 3D: installed 1.9.2 vs latest (1.14.2, 2026-10-26)

| Feature | 1.9.2 (installed) | Latest | Introduced |
|---|---|---|---|
| `view3d`, `point3d`, `curve3d`, `line3d`, `plane3d`, `functiongraph3d`, `parametricsurface3d` | Yes (`src/3d/`: box3d, circle3d, curve3d, point3d, polygon3d, sphere3d, surface3d, view3d…) | Yes | Before 1.9 |
| Central (perspective) projection | Yes (`projection: 'central'`, default `'parallel'`) | Yes | 1.9.0 |
| Virtual trackball | Yes (`trackball`, off by default) | Yes, improved | 1.9.0, improved 1.9.2 |
| Keyboard view control | az: ←/→, el: ↑/↓, bank: `<`/`>` (with `.`/`,`), PageUp/PageDown cycles stored views, `ctrl` modifier by default | Same | 1.9.0 fix, bank slider 1.9.2 |
| `sphere3d`, `circle3d`, `polygon3d`, intersection line/circle | Yes | Yes | 1.9.0 |
| `point3d` drag | Free point moves in a plane parallel to $xy$ (keeps $z$). With the vertical-drag key (default `shift`) it moves along $z$. Can glide on lines/curves | Clamped to the view box (1.10.1), "improved dragging" (1.11.0), sphere gliders (1.11.0), plane gliders without shift (1.13.0) | |
| Surface rendering | `surface3d` is drawn as one 2D `curve` mesh: **wireframe only**, `stepsU`/`stepsV` | `tiling: 'wireframe'` \| `'rectangle'` \| `'triangle'`. Filled tiles render as `polyhedron3d` with `shader`, `colorarray`, `colormap` | Surface-as-polyhedron 1.13.0 |
| Depth ordering | **Points only** (`depthOrderPoints`, SVG renderer only) | General `depthOrder` across elements and layers, faster and more correct in 1.12 | 1.11.0 |
| `polyhedron3d` / `face3d`, shader | No | Yes, user light angle (`shader.light`) 1.13.0, STL import/export 1.12.0 | 1.11.0 |
| `text3d`, `ticks3d` | No | Yes. The 3D infobox works with KaTeX/MathJax (1.10.0 fix) | 1.10.0 |
| 3D transformations (affine on 3D elements) | No | Yes (1.11.0, more types 1.13.0) | 1.11.0 |
| `surface3d.F` returns homogeneous `[1,x,y,z]` | n/a | API change in 1.13.2 | 1.13.2 |
| TypeScript declarations for 3D | Partial | Completed in 1.13.3 | 1.13.3 |

Implications:

- 1.9.2 can teach wireframe patches, control nets (`line3d`/`polygon3d`), draggable control points with shift-for-$z$, orbit and presets. It **cannot** draw shaded or opaque surfaces, and it does not depth-sort faces or lines, so nets and surfaces will overlap incorrectly when rotated.
- A JSXGraph upgrade to ≥ 1.13 makes shaded surfaces with depth order and labels possible inside the existing library. That is a separate, bounded dependency change: the 2D curve boards would need regression checks across 1.10–1.14, and 1.13.2 changed the `surface3d.F` API. JSXGraph 3D is SVG/Canvas painter-style rendering (sorted 2D primitives), not GPU z-buffering. Dense shaded meshes and intersecting surfaces will be limited in quality and speed compared to WebGL. Measure before committing (see the performance plan).
- JSXGraph is dual-licensed MIT OR LGPL-3.0-or-later (npm metadata).

### 4.2 three.js

- Mature WebGL renderer with z-buffered shading, lighting and materials. OrbitControls supports mouse, touch (one-finger orbit, two-finger zoom/pan), optional arrow-key panning (`listenToKeyEvents`) and damping.
- Addons include `TeapotGeometry`, built from Newell's patch data, plus drag controls and HTML/CSS label renderers.
- Version 0.186.1 on npm, MIT licence. The package is large on disk (about 20 MB unpacked). Shipped bundle size depends on tree shaking, and no Bezeg-specific bundle measurement was made.
- Bezeg would own: constrained 3D dragging (raycast to a plane, plus a $z$ mode), keyboard/ARIA access for points, LaTeX labels (HTML overlay with KaTeX/MathJax), the de Casteljau overlay geometry, and disposal of GPU resources. It is a strong option if shading, teapot-scale meshes or performance outgrow JSXGraph. It is also a second rendering stack beside JSXGraph, which conflicts with the "evaluate renderer migrations separately" constraint unless it is isolated to the surface family.

### 4.3 Others

- **Plain WebGL / WebGL2:** no dependency, but camera, picking, lines (WebGL line width is effectively 1 px on most platforms) and text all become hand-written. This is unreasonable for a teaching app.
- **regl** (2.1.1, MIT): a functional WebGL wrapper. It reduces state bugs but provides no scene graph, controls or text.
- **Babylon.js** (`@babylonjs/core` 9.32.0, Apache-2.0): a full engine with gizmos for dragging, GUI and accessibility helpers. It is heavier and more game-oriented, and offers no clear advantage over three.js here.
- **SVG with Bezeg-owned projection:** project the net and iso-curves with a parallel projection and painter's sort. This is feasible for wireframe-plus-net teaching (which is what lessons 1–9 mainly need) and keeps vector export. It shares JSXGraph's depth-sorting limits.

### 4.4 Trade-off summary

| Option | Shading / depth | 3D point drag | Labels / LaTeX | Fit with app | Licence |
|---|---|---|---|---|---|
| JSXGraph 1.9.2 (installed) | Wireframe, points-only depth | Built in (xy-plane + shift for z) | Board text (2D) | No new dependency | MIT/LGPL |
| JSXGraph ≥ 1.13 | Painter-sorted faces, simple shader | Built in, improved | `text3d`, KaTeX/MathJax infobox | Same library, upgrade risk for 2D boards | MIT/LGPL |
| three.js | Full GPU shading, z-buffer | Build yourself | HTML overlay | Second renderer stack | MIT |
| Babylon.js | Full | Gizmos | GUI/overlay | Heavy | Apache-2.0 |
| Plain WebGL / regl | Full, all manual | Manual | Manual | High effort | — / MIT |

Suggested next step (judgement): prototype lessons 1–5 in a scratch branch on JSXGraph latest. Measure drag frame time for a bicubic patch with a 16×16 iso-grid plus net, and for a shaded 8×8-tile surface. Only consider three.js if shading or the teapot capstone is unacceptable there.

## Sources

Textbooks and papers (bibliographic; chapter numbers vary by edition):

- G. Farin, *Curves and Surfaces for CAGD: A Practical Guide*, 5th ed., Morgan Kaufmann, 2002. Chapters on tensor-product Bézier patches, composite surfaces, triangular patches, rational surfaces and Coons patches.
- H. Prautzsch, W. Boehm, M. Paluszny, *Bézier and B-Spline Techniques*, Springer, 2002.
- J. Hoschek, D. Lasser, *Fundamentals of Computer Aided Geometric Design*, A K Peters, 1993.
- L. Piegl, W. Tiller, *The NURBS Book*, 2nd ed., Springer, 1997. The "Construction of common surfaces" chapter covers cylinders, surfaces of revolution and spheres.
- G. Farin, "Triangular Bernstein–Bézier patches", *Computer Aided Geometric Design* 3(2), 1986, pp. 83–127.
- G. Farin, B. Piper, A. Worsey, "The octant of a sphere as a non-degenerate triangular Bézier patch", *Computer Aided Geometric Design* 4(4), 1987, pp. 329–332.
- P. Bézier, *Numerical Control: Mathematics and Applications*, Wiley, 1972.
- P. de Casteljau, *Outillages méthodes calcul*, internal report, André Citroën, 1959; and *Courbes et surfaces à pôles*, 1963.
- S. A. Coons, *Surfaces for Computer-Aided Design of Space Forms*, MIT Project MAC, MAC-TR-41, 1967.
- M. E. Newell, *The Utilization of Procedure Models in Digital Image Synthesis*, PhD thesis, University of Utah, 1975.
- J. F. Blinn, M. E. Newell, "Texture and reflection in computer generated images", *Communications of the ACM* 19(10), 1976.
- H. Wallach, D. N. O'Connell, "The kinetic depth effect", *Journal of Experimental Psychology* 45(4), 1953, pp. 205–217.
- C. Ware, *Information Visualization: Perception for Design*, 4th ed., Morgan Kaufmann, 2021.

Web:

- Pomax, *A Primer on Bézier Curves* (curve parallels): https://pomax.github.io/bezierinfo/
- F. Crow, "The Origins of the Teapot" (1987): https://graphics.cs.utah.edu/teapot/The%20Origins%20of%20the%20Teapot.pdf
- C. Yuksel, J. Blinn, M. Newell, "The Return of the Utah Teapot" (2026; authorship per search-result summary): https://graphics.cs.utah.edu/teapot/The_Return_of_the_Utah_Teapot.pdf
- ACM SIGGRAPH History Archives, "Martin Newell's Original Teapot": https://history.siggraph.org/?p=223691
- I. Mallett, "Utah Teapot: Artifact, History, Datasets": https://geometrian.com/resources/utah_teapot/
- WCAG 2.2 (SC 1.4.1, 2.1.1, 2.5.7): https://www.w3.org/TR/WCAG22/
- JSXGraph View3D reference: https://jsxgraph.org/docs/View3D.html
- JSXGraph ParametricSurface3D reference: https://jsxgraph.org/docs/ParametricSurface3D.html
- JSXGraph Point3D reference: https://jsxgraph.org/docs/Point3D.html
- JSXGraph CHANGELOG: https://github.com/jsxgraph/jsxgraph/blob/main/CHANGELOG.md
- JSXGraph releases: https://github.com/jsxgraph/jsxgraph/releases
- JSXGraph 1.9.2 published source (view3d.js, point3d.js, surface3d.js): https://app.unpkg.com/jsxgraph@1.9.2/files/src/3d
- three.js TeapotGeometry: https://threejs.org/docs/pages/TeapotGeometry.html
- three.js OrbitControls: https://threejs.org/docs/pages/OrbitControls.html
- npm registry metadata (`npm view`) for jsxgraph, three, @babylonjs/core and regl versions/licences, queried 2026-10-26.
