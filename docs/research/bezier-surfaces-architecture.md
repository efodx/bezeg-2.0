# Bézier surfaces: architectural requirements

Repository inspection: 2026-10-26. This note maps what a Bézier surface learning family needs from the app. It is planning input for a later spec under `docs/specs/`, not an accepted decision. The mathematical and teaching material, plus first-party library facts, are in [bezier-surfaces.md](bezier-surfaces.md).

## Summary

Every layer currently assumes planar geometry. The chapter/catalog layers extend additively; the geometry, rendering, interaction, Preset and lesson layers need new 3D counterparts. The owner has decided the scope (both tensor-product and triangular patches), accepted a JSXGraph upgrade, and dropped a 3D-curve demonstration. The remaining consequential choice is the renderer: confirm JSXGraph 3D through a measured spike on the upgraded library, and record it in an ADR before building demonstrations.

| Layer | Today | Needed for surfaces | Size |
| --- | --- | --- | --- |
| Family and catalog | `families` in `src/demonstrations.ts`, `FamilyId`, metadata, `familyChapters.ts`, `learningChapters.ts` | New `surfaces` family, demonstrations, bilingual chapter | Additive, small |
| Geometry | `Point` is `X()/Y()` (`src/bezeg/api/point/point.ts`); curve impls are Point-based | Numeric 3D surface module independent of `Point`, JSXGraph and React | New module, medium |
| Rendering | JSXGraph 1.9.2 2D board per graph via `GraphSession`/`BaseGraph` | Projected 3D view: wireframe/net, iso-curves, optionally shaded patch, camera | **Decision needed**, large |
| Interaction | 2D drag, `CurveEditingFeature`, structured x/y editing | 3D point editing without depth ambiguity, orbit, preset views, keyboard/touch | Medium–large |
| Presets | 2D curve DTOs via `ClassMapper`, 2D board bounds | New surface DTO, 3D box + camera, validation | Additive format change |
| Lessons | `LessonPoint`, `LessonViewBox`, `LessonCurveFixture` are 2D; action union is curve-specific | Surface fixture, 3D view/camera, surface actions | Medium |
| Previews and reading | Posters/WebM per demonstration; drag recipes are 2D | Orbit/parameter-sweep recipes; static surface figures | Medium |
| Localization | `sl.ts`/`en.ts` lockstep | Surface vocabulary in both catalogs | Small |

## 1. Family, routes and chapter

- Add `{id: '/bezeg-2.0/patches', title: 'bezier_patches'}` to `families` (`src/demonstrations.ts:7`). Its Slovenian title is **Bézierjeve krpe** (owner decision, 2026-10-26; *trikotna krpa* is not used), and the English title is *Bézier patches*. Its routes follow the existing pattern (`/bezeg-2.0/patches/...`), are registered in `graphFactories.ts` and `Routes.tsx`, and use `DemonstrationWorkspace`. New routes break nothing.
- Add a `FamilyChapter` in `src/learning/content/familyChapters.ts`. Its sections reference the surface demonstration IDs and are served by `FamilyChapterPage` at `/learn/<chapter-id>`. The Bézier-curve chapter is a prerequisite, so it should sit after splines/rational curves in `learningChapters.ts`.
- `FamilyChapterSection` (`familyChapters.ts:11`) already carries prose, a formula, demonstration IDs, figures and investigation prompts; no schema change is needed. Reading pages mount no boards, so surface figures are pre-rendered captures, the same as current figures.
- Proposed demonstration set (see the research note for pedagogy). Each is a bounded slice:
  There is no separate 3D Bézier curve demonstration (owner decision, 2026-10-26). The first patch demonstration introduces the 3D view and editing directly.
  1. **Tensor-product patch.** It shows the control net, iso-curves and boundary curves, with drag and orbit.
  2. **Surface de Casteljau at `(u, v)`.** It has a two-stage (rows → column) construction and a direct bilinear variant.
  3. **Partial derivatives, tangent plane and normal.**
  4. **Subdivision and degree elevation in `u` or `v`.**
  5. **Patch joins.** It shows C0/C1 conditions on the shared net row.
  6. **Triangular patch**, with barycentric de Casteljau. It is in the first release (owner decision, 2026-10-26).
  7. **Square vs triangular comparison**, using the same boundary degree side by side. This is optional if demonstration 6 can toggle a comparison overlay.

## 2. Geometry module

Create `src/bezeg/impl/surface/` (with API types in `src/bezeg/api/surface/`). It should work on numeric `Vec3 = readonly [x, y, z]` arrays, not on the 2D, function-capable `Point`. This follows the target "Geometry" module in [curve-architecture-deep-dive.md](../curve-architecture-deep-dive.md#proposed-target-modules): numeric definitions in, evaluations/constructions out, with no JSXGraph or graph-global cache.

- **Core kernel:** a dimension-generic de Casteljau on `number[][]` (points as coordinate arrays) returning the full triangular scheme. Surfaces apply it row-wise, then once along the column (two-stage). The direct bilinear scheme is a separate function so lessons can compare them. Do not refactor curve classes onto it in the same change; curves keep their own tested path.
- **`TensorProductBezierSurface`** (degree `(m, n)`, net `(m+1)×(n+1)`):
  - evaluate `S(u, v)`;
  - scheme at `(u, v)`;
  - partials `S_u` and `S_v` from difference nets;
  - unit normal, guarded for degenerate cases such as collapsed corners;
  - boundary curves and iso-curves, returned as curve control points;
  - subdivision at `u₀` or `v₀`;
  - degree elevation in `u` or `v`;
  - bounding box.
- **`TriangularBezierSurface`** (first release). It has total degree `n` and `(n+1)(n+2)/2` points indexed by `(i, j, k)` with `i+j+k=n`. Store the points in one flat array with a documented index map; do not use a ragged 2D array. Operations:
  - evaluate `S(u, v, w)` with `u+v+w=1`;
  - full barycentric de Casteljau scheme (levels `n…0`);
  - directional derivatives from the level-1 points, and the normal;
  - three boundary curves and edge-parallel iso-curves;
  - subdivision at an interior parameter point into three sub-patches (nets read from the scheme's faces);
  - degree elevation `b'_{ijk} = (i·b_{i-1,j,k} + j·b_{i,j-1,k} + k·b_{i,j,k-1})/(n+1)`.

  The barycentric step is not a 1D de Casteljau, so it gets its own kernel. It does not reuse the row/column kernel.
- **Shared surface interface.** Both patch types expose evaluate, normal, boundary curves, a sampled mesh and the bounding box, so the renderer adapter, Presets and lessons handle either. Type-specific constructions (row/column scheme vs barycentric scheme) stay on the concrete types.
- **Later:** `RationalTensorProductSurface` and the rational triangular patch (homogeneous weights, as rational curves do now).
- **Freshness:** reuse `versioning.ts` stamps. Net edits stamp the surface. Sampled meshes and iso-curves are cached by `(surface version, sample density)`, as curve constructions cache by version plus parameter.
- **Mathematical checks** (per AGENTS): Bernstein-sum vs de Casteljau agreement; corner interpolation; boundary curve equals the curve built from the boundary row; partition of unity; affine invariance; subdivision halves re-evaluate to the original; elevation preserves every sample; `S_u`, `S_v` match finite differences; normal ⟂ partials; C1 join condition reproduces matching cross-boundary derivatives. Fixed Utah-teapot patch data makes a good golden fixture.
- **Triangular-patch checks:**
  - barycentric de Casteljau agrees with the trinomial Bernstein sum;
  - the basis sums to 1;
  - the three vertices are interpolated;
  - each boundary equals the degree-`n` curve of its edge row;
  - the three sub-patches from subdivision re-evaluate to the original;
  - elevation preserves samples;
  - a planar or linear-precision net reproduces the plane.
- **Cross-type check:** a tensor patch with a collapsed edge, or a triangle split from a tensor patch, matches samples of the corresponding triangular patch.

## 3. Rendering (decision needed)

Today each graph owns one JSXGraph board through `GraphSession`. Export, Presentation mode, resize, readiness and disposal all hang off that board.

| Option | Reuses | New costs | Risks |
| --- | --- | --- | --- |
| **A. JSXGraph `View3D` inside the existing board** | `GraphSession`, `BaseGraph`, SVG/PNG figure export, Presentation mode, resize, disposal, styles in `GraphPalette` | 3D adapter objects (`point3d`, `curve3d`, `surface3d`, faces) | Installed 1.9.2 supports wireframe surfaces only and depth-sorts points only; it has `point3d` drag in the xy-plane with Shift for z, orbit/trackball and keyboard rotation. Filled, depth-ordered faces need ≥ 1.11, shaded surface tiling needs ≥ 1.13, and 1.13.2 changed the `surface3d.F` API. Upgrading touches all routes and must be evaluated separately ([AGENTS: bounded migrations](../../AGENTS.md)). See [research §4.1](bezier-surfaces.md#41-jsxgraph-3d-installed-192-vs-latest-1142-2026-10-26). |
| **B. three.js (lazy-loaded chunk)** | Workspace shell, lessons, Presets | Second render lifecycle beside `GraphSession`; own export, labels/MathJax, hit testing, Presentation sizing; new dependency | Splits ownership (two renderers); WebGL export and classroom PC quirks; bundle size |
| **C. Custom SVG projection** (painter's sort per quad) | Pure-math ownership direction from the deep dive; SVG export | Projection, depth sort, hit testing, drag, labels | More code owned by Bezeg; quality limits for intersecting surfaces |

**Owner decision (2026-10-26):** upgrading JSXGraph is acceptable.

**Recommendation:** first upgrade JSXGraph from 1.9.2 to the latest 1.x (1.14.x at research time) as its own bounded change, with no surface code. Regression-check the existing 2D routes: mathematical tests, transient-state contract, figure export, preview captures and the full smoke checklist, since the upgrade touches every board. Then run a bounded spike with option A on the upgraded library. Use one bicubic patch and one cubic triangular patch (net, iso-curves, de Casteljau construction, orbit, shaded `polyhedron3d` faces). Measure drag/orbit frame cost on desktop and the representative phone ([performance-plan.md](../performance-plan.md)), plus export, labels and Presentation mode. Adopt A if it is acceptable; otherwise fall back to B (three.js), isolated to this family. Record the upgrade and the renderer outcome in an ADR.

Whichever option wins, put it behind a small surface-view adapter: `attach`, `reconcile(scene)`, `onEdit`, `dispose`. Geometry and lessons never touch the renderer. This matches the target JSXGraph-adapter shape in the deep dive.

## 4. Interaction and controls

- **Depth-ambiguous dragging.** A 2D pointer cannot specify a 3D position. Candidate rules, to be tested in the spike:
  - drag in the plane parallel to the screen through the point;
  - drag along the vertical `z` axis with a modifier key or mode toggle;
  - drag in the `xy` plane by default.

  Always pair dragging with the existing structured coordinate editor, extended to `x, y, z`. That editor is the precise and accessible path, and is needed for touch and keyboard.
- **Camera.**
  - Orbit by dragging empty space, or with az/el sliders in **Prikaz**.
  - Preset view buttons: front, top, side, isometric. These matter for projection and for comparing the same view across a class.
  - Reset view.
  - The camera stays still while a control point is dragged.
  - Keyboard: arrow keys orbit when the view has focus.
- **Inspector placement.** Mathematical parameters (`u`, `v`, degrees, subdivision parameter) go in **Uredi**. Display options (net, iso-curve density, boundary curves, shading, normals, camera) go in **Prikaz**, following the one-home rule in [current-architecture.md](../current-architecture.md).
- **Parameter domain inset.** A small 2D board shows the parameter domain: the unit square for tensor patches, the reference triangle for triangular ones. Dragging a point in it sets `(u, v)` or `(u, v, w)`. This is the clearest way to make barycentric coordinates concrete, and it avoids three coupled sliders. Its ownership and disposal can mirror the PH hodograph child board, but it should be owned by `GraphSession`.
- **Triangular parameter entry.** For keyboard and touch, use two sliders `u` and `v` with `w = 1 − u − v` shown read-only and clamped to the triangle. Do not use three independent inputs.
- **Selection model.** Pick a net point by `(i, j)` index (tensor) or `(i, j, k)` index (triangular). Highlight its row and column, or for a triangular patch its three edge-parallel lines. Show its Bernstein weight: `B_i^m(u)B_j^n(v)` or `n!/(i!j!k!)·u^i v^j w^k`. This replaces curve selection; `BaseCurveGraph`/`CurveEditingFeature` are curve-specific. A `BaseSurfaceGraph` beside `BaseCurveGraph` composes surface editing and reuses `BaseGraph`.

## 5. Scene state, transient state and Presets

- **New DTO class identifiers** in `ClassMapper`, `BezierSurface` and `TriangularBezierSurface`, both in the first release. A tensor patch carries `(m, n)` and a row-major net. A triangular patch carries `n` and a flat net in the documented `(i, j, k)` order. Both carry points as `[x, y, z]`, with optional weights reserved for rational patches. Validation checks that the net length is `(m+1)(n+1)` or `(n+1)(n+2)/2`. This is an additive format change: old Presets and files still load. Record it per the breaking-change rule anyway, because the Preset vocabulary grows.
- **View in Presets.** Store a 3D box and camera (`az`, `el`, distance/zoom, projection) instead of, or beside, 2D `boundingBox`. Decide whether the camera is scene state (saved, restored by lessons) or transient state. Saving it is recommended, so classroom Presets reopen at the authored view.
- **Validation in the Preset codec:** rectangular net, degree limits (for example ≤ 5 in each direction for legibility and performance), finite coordinates, positive weights. Unsupported files get the existing actionable error.
- **Transient state** (declared via `captureTransientState`/`restoreTransientState`, ADR 0015): the selected net point, the de Casteljau `(u, v)` drawing cache, and subdivision previews. Add the new graphs to `graphTransientStateContract.tsx`.

## 6. Guided lessons

`LessonGraphCapabilities` and `LessonSceneCheckpoint` are renderer-agnostic and opaque, so the lesson runtime itself needs no change. Content types do:

- `LessonPoint3 = readonly [x, y, z]`, plus a `LessonSurfaceFixture` holding the net, degrees and optional weights.
- `LessonView3D`, holding the camera and the 3D box. It needs a 3D counterpart of `applyLessonView`, which today fits a 2D box to the canvas aspect.
- New `LessonAction` kinds, for example:
  - `surface-evaluation {u, v}` (tensor), or `{u, v, w}` with a validated `u+v+w=1` (triangular);
  - `surface-visibility` targets: `control-net`, `iso-curves`, `boundary-curves`, `decasteljau-scheme`, `tangent-plane`, `normal`, `shading`;
  - `surface-subdivide {direction, value}`;
  - `surface-elevate {direction}`;
  - `camera-preset {view}`;
  - `u`/`v` parameter sweep animations added to `LESSON_ANIMATION_IDS`.

  Register them through `LessonActionRegistry` with shared `surfaceLessonActions`, as `curveLessonActions` does.
- Scenes stay synchronous (`SceneStore` contract). Unit-test multi-action surface scenes in one tick.
- Prose follows `lessonMathNotation.test.ts`: `\(S(u,v)\)`, `{,}` decimal commas.

## 7. Previews, figures, smoke tests

- Every catalogue demonstration has a poster and WebM capture. `scripts/demonstration-preview-motion.cjs` offers `pointer-drag` (2D handle) and `parameter-sweep`. Surfaces need either a camera-orbit mode or recipes limited to `parameter-sweep`, for example moving `u`/`v` or a net point's `z` via the numeric editor. Frame assertions need 3D-aware mathematical observers.
- Chapter figures are captured from real routes, as existing chapter figures are.
- Smoke tests should cover the new routes (orbit, drag, numeric edit, Preset round-trip, lesson enter/exit) per [smoke-tests.md](../smoke-tests.md).

## 8. Suggested sequence

1. **JSXGraph upgrade** to the latest 1.x, as its own change with full 2D regression checks.
2. **Renderer spike + ADR** on the upgraded library. Measured; no production code.
3. **Spec** in `docs/specs/bezier-patches.md`, with acceptance criteria and the demonstration list.
4. **Geometry module with mathematical tests** for both tensor and triangular patches. It is independent of rendering, so it can run in parallel with steps 1–2.
5. **Tensor-product patch demonstration.** This proves the surface-view adapter, 3D editing, camera, Presets and transient state. Then the de Casteljau demonstration and the chapter reading pages.
6. **Triangular patch demonstration,** with the parameter-domain inset.
7. **Guided lessons** with fixtures and new actions, plus previews.
8. **Derivatives/normals, subdivision/elevation, joins** for both patch types; rational patches come as a later slice.

## Open questions for the owner

- ~~**Scope:** tensor-product only at first, or triangular patches in the first release?~~ **Decided 2026-10-26:** both tensor-product (square) and triangular patches ship in the first release.
- **Rendering for triangles:** JSXGraph `parametricsurface3d` takes a rectangular `(u, v)` domain. A triangular patch therefore needs either a degenerate square-to-triangle reparameterization, or Bezeg-built triangle meshes (`polygon3d` in 1.9.2, `polyhedron3d` faces in ≥ 1.11). The renderer spike must cover one cubic triangular patch as well as the bicubic one.
- ~~**Dependencies.**~~ **Decided 2026-10-26:** a JSXGraph upgrade is acceptable. three.js remains only the fallback if the spike rejects JSXGraph.
- ~~**3D curves.**~~ **Decided 2026-10-26:** no 3D Bézier curve demonstration.
- **Terminology.** **Decided 2026-10-26:** the family is *Bézierjeve krpe*, not *trikotna krpa*. The remaining Slovenian terms are confirmed in the spec, including the names for the two kinds, the control net (*kontrolna mreža*?) and iso-curves.
