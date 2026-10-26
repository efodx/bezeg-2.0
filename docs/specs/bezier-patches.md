# Bézier patches (Bézierjeve krpe)

Status: in progress. The owner requested the spec on 2026-10-26. [Task 01](../tasks/bezier-patches/01-jsxgraph-upgrade.md) (P1, JSXGraph 1.14.1) and [task 03](../tasks/bezier-patches/03-shared-kernels.md) (shared kernels) are complete; tasks 02 and 04 remain planned. Tasks for the later slices are created after task 02's renderer ADR. Sources:
- [teaching research](../research/bezier-surfaces.md): mathematics, lesson outline, misconceptions, library facts;
- [architecture research](../research/bezier-surfaces-architecture.md): layer-by-layer requirements.

## Outcome and scope

Bezeg gains a ninth learning family, **Bézierjeve krpe** (*Bézier patches*). It extends the curve chapters to surfaces. Students drag control points in 3D, see how the control net shapes a patch, evaluate it with de Casteljau, and recognise that boundaries and iso-curves are the Bézier curves they already know. The family teaches **tensor-product (square) and triangular patches** in the first release. It has a bilingual chapter, demonstrations in the shared workspace, and guided lessons, all inside the existing static, client-only app.

Out of scope for this spec:
- rational patches (a later slice; the weighted kernel is kept so it stays cheap);
- B-spline/NURBS and Coons surfaces;
- a standalone 3D-curve demonstration;
- mesh/STL import;
- assessments or persistent progress;
- any backend.

## Owner decisions (2026-10-26)

- **D1:** both tensor-product and triangular patches ship in the first release.
- **D2:** upgrading JSXGraph from 1.9.2 is acceptable. It is done first, as its own change.
- **D3:** there is no separate 3D Bézier curve demonstration. The first patch demonstration introduces the 3D view.
- **D4:** the family is named *Bézierjeve krpe*. *Trikotna krpa* is not used as a term.
- **D5:** patches share the existing curve algorithms, and points are extended to 3D (the owner's earlier roadmap idea). There is no parallel surface implementation.

## Starting seams, inspected at `3840f4f`

- `src/bezeg/impl/curve/polynomial-bezier-curve.ts:84` `runDeCasteljau` is the single recurrence for polynomial and rational evaluation, scheme, subdivision and extrapolation. It already handles coordinate rows of any length, with a 2D fast path. The 2D coupling lives in `eval`/`evaluatePoint`, `decasteljauScheme` (builds `PointImpl(x, y)`) and `elevate` (explicit `x`/`y`).
- `src/bezeg/api/point/point.ts`: `Point` has only `X()/Y()`. `PointImpl` (`src/bezeg/impl/point/point-impl.ts`) supports function-backed coordinates and version stamps (`src/bezeg/impl/versioning.ts`).
- Planar-only code that must not silently accept 3D:
  - PH curves (`ph-bezier-curve.ts`, `ph-math.ts`);
  - `convexHull`, `chordKnots`, `boundingBoxOf`, `distance` in `geometry.ts`;
  - curve DTOs and `ClassMapper`;
  - `ModelPointBinding`.
- Family and catalog:
  - `families` and the Demonstration metadata in `src/demonstrations.ts`;
  - `graphFactories.ts`, `Routes.tsx`;
  - `learning/content/familyChapters.ts`, `learning/learningChapters.ts`.
- Graph layer:
  - `BaseGraph` and `GraphSession` own the board and its lifetime. `BaseCurveGraph` and `CurveEditingFeature` are curve-specific.
  - Preset collections are static per-family definitions ([ADR 0016](../adr/0016-preset-collections-owned-by-graph-families.md)).
  - Transient state is declared per graph ([ADR 0015](../adr/0015-graph-transient-state-declaration.md)).
- Lessons:
  - `learning/model.ts` uses 2D `LessonPoint`, `LessonViewBox` and `LessonCurveFixture`.
  - `LessonGraphCapabilities` and its checkpoints are opaque.
  - Actions register through `LessonActionRegistry`.
- Previews: `scripts/demonstration-preview-motion.cjs` (`pointer-drag` is 2D; `parameter-sweep` is generic) and `scripts/capture-chapter-figures.cjs`.

These are entry points for investigation. Implementations may reshape them.

## Demonstrations

Route IDs are proposals; task 02's ADR may merge demonstrations if one board serves two concepts well.

| ID | Route | Teaches |
| --- | --- | --- |
| `patch-tensor` | `/bezeg-2.0/patches/tensor` | Control net, bi-degree `(m, n)` from 1 to 4, iso-curves, boundary curves, convex hull, corner interpolation. Presets include the bilinear saddle and a bicubic dome. |
| `patch-decasteljau` | `/bezeg-2.0/patches/decasteljau` | Two-stage (rows → column) and direct bilinear de Casteljau at `(u, v)`. The parameter-domain inset is the unit square. |
| `patch-derivatives` | `/bezeg-2.0/patches/derivatives` | `S_u`, `S_v`, tangent plane, normal and twist, at a point and at corners. |
| `patch-subdivision` | `/bezeg-2.0/patches/subdivision` | Subdivision at `u₀` or `v₀`, and degree elevation in `u` or `v`. |
| `patch-joins` | `/bezeg-2.0/patches/joins` | Two tensor patches sharing a boundary, with C0/C1 conditions on the net and the G1 distinction. |
| `patch-triangular` | `/bezeg-2.0/patches/triangular` | Triangular net of degree `n` from 1 to 4, barycentric `(u, v, w)` via the triangle inset, barycentric de Casteljau, boundary curves, subdivision into three, elevation. |
| `patch-compare` | `/bezeg-2.0/patches/compare` | A tensor and a triangular patch with the same boundary degree side by side. Optional if `patch-triangular` can show a comparison overlay. |

The Utah teapot is the capstone, either as a `patch-joins` Preset (32 bicubic patches) or as a lesson scene. It ships only if task 02 shows acceptable rendering at that size; otherwise a single teapot patch is used. Check the licence of the teapot data source and record it beside the asset.

## Chapter and guided lessons

The chapter follows [research §2.2](../research/bezier-surfaces.md#22-suggested-chapter-outline), adjusted for D1 and D3. Each lesson is a guided lesson owned by a chapter section ([chapter-owned guided learning](chapter-owned-guided-learning.md)), with the measurable takeaway stated in the research.

1. **From curve to patch:** a moving Bézier curve sweeps out a patch (`patch-tensor`).
2. **The bilinear patch:** the saddle and its straight lines; `S(½, ½)` by hand.
3. **Control net and tensor-product definition:** control-point counts, partition of unity, interpolated corners.
4. **Boundary and iso-curves:** iso-curve control points are computed from the net, not read from it.
5. **De Casteljau on a patch:** two-stage and bilinear evaluation; order independence (`patch-decasteljau`).
6. **Properties and non-properties:** convex hull, affine invariance; variation diminishing fails.
7. **Tangent plane, normal, twist** (`patch-derivatives`).
8. **Degree elevation and subdivision** (`patch-subdivision`).
9. **Joining patches**, with the teapot capstone (`patch-joins`).
10. **Triangular patches:** barycentric coordinates, de Casteljau at the centroid, boundaries (`patch-triangular`).
11. **Square vs triangular:** what each represents naturally (`patch-compare`, or the overlay).

The chapter is prerequisite-linked to Bézier curves and is placed after the curve families in `learningChapters.ts`. Address the misconceptions listed in [research §2.3](../research/bezier-surfaces.md#23-common-misconceptions) explicitly in prose or lesson frames.

## Shared geometry contract

- **Kernels** (task 03): pure functions on `number[][]` rows of any dimension, with no `Point`, JSXGraph or React:
  - de Casteljau (optional weights and scheme);
  - polynomial and rational degree elevation;
  - subdivision;
  - extrapolation.

  Polynomial and rational curves delegate to them with identical results.
- **3D points** (task 04):
  - `Point` gains an optional `Z()`, where absent means `0`. `PointImpl` gains an optional `z` with its own stamp. Curve edges carry `z`, so a polynomial or rational curve over 3D points evaluates, subdivides and elevates in 3D.
  - Planar-only code is typed or guarded so a nonzero `z` is rejected, never silently dropped.
  - 2D DTOs and Presets are unchanged.
- **Patch types** (later task):
  - `TensorProductBezierPatch`, with a row-major `(m+1)×(n+1)` net. Evaluation is rows → column through the curve kernel. Boundary curves and iso-curves are curve objects. Subdivision and elevation apply per row or column. The bilinear recurrence is a separate function.
  - `TriangularBezierPatch`, with a flat net in the canonical order below and its own barycentric recurrence. Elevation follows `b'_{ijk} = (i·b_{i-1,j,k} + j·b_{i,j-1,k} + k·b_{i,j,k-1})/(n+1)`. Subdivision at an interior point yields three nets read from the scheme.
  - A shared patch interface: evaluate, normal, boundary curves, sampled mesh, bounding box.
  - Caching keys on version stamps and sample density.
- **Canonical triangular order:** enumerate `i` from `n` down to `0`, then `j` from `n−i` down to `0`, with `k = n−i−j`. Index 0 is `(n,0,0)` and the last index is `(0,0,n)`. Presets and lesson fixtures use this order.

## Rendering and interaction contract

- **Renderer:** chosen by task 02's ADR. The default candidate is JSXGraph 3D (`view3d`) inside the board owned by `GraphSession`, after task 01's upgrade. The fallback is three.js isolated to this family. Either way, it sits behind a surface-view adapter (`attach`, `reconcile(scene)`, `onEdit`, `dispose`). Geometry, lessons and React never touch renderer objects.
- **View:** the control net, its points and the patch are visible, with optional shaded faces, iso-curve grid, boundary curves, normals and tangent plane. Lines and faces must be depth-ordered correctly enough that the net does not visibly overlap the wrong side of the patch at preset views.
- **Camera:**
  - orbit by dragging empty space;
  - az/el controls in **Prikaz**;
  - preset views: front, top, side, isometric;
  - reset view;
  - keyboard orbit when the view is focused.

  The camera does not move while a control point is dragged.
- **Point editing:**
  - pointer drag in the horizontal plane, with Shift (or a visible mode toggle for touch) moving along `z`;
  - always paired with the structured coordinate editor extended to `x, y, z`;
  - points selectable by `(i, j)` or `(i, j, k)`.

  The selected point's row and column, or its three edge-parallel lines, are highlighted, with its Bernstein weight at the current parameter.
- **Parameter-domain inset:** a small 2D board, owned by `GraphSession` and disposed with it, shows the unit square or reference triangle. Dragging there sets `(u, v)` or `(u, v, w)`. Keyboard entry uses `u` and `v` sliders, with `w = 1 − u − v` read-only and clamped.
- **Inspector homes:** mathematical parameters (`u`, `v`, degrees, subdivision parameter, join continuity) are in **Uredi**. Visibility, shading, camera and iso-curve density are in **Prikaz**.
- **Graph base:** a `BaseSurfaceGraph` (or equivalent composition) reuses `BaseGraph` for Presets, export, Presentation mode and lifecycle. It does not extend the curve-specific base.

## Presets, scene state and lessons

- **Preset collection:** a new `patchPresetCollections` family module per ADR 0016. Its DTOs:
  - `TensorProductBezierPatch`: `{m, n, net: [x, y, z][]}`, row-major;
  - `TriangularBezierPatch`: `{n, net: [x, y, z][]}`, canonical order.

  `weights` is reserved and rejected until rational patches exist. `check` rejects:
  - a wrong net length (`(m+1)(n+1)` or `(n+1)(n+2)/2`);
  - degrees outside 1–4;
  - non-finite coordinates;
  - unknown fields;

  with localized reasons. The existing file envelope, names and import flow are unchanged. This additive vocabulary change is recorded in the capabilities doc; existing Presets and files are unaffected.
- **Camera:** saved in scene state (az, el, zoom/distance, projection, 3D box), so Presets and lessons reopen at the authored view.
- **Transient state:** the selected point, the de Casteljau drawing cache and subdivision previews, declared through `captureTransientState`/`restoreTransientState` and covered by the transient-state contract.
- **Lesson model additions:**
  - `LessonPoint3`;
  - `LessonPatchFixture` (kind, degrees, net);
  - `LessonView3D` (camera and 3D box), with a 3D counterpart of `applyLessonView`.
- **Lesson actions**, registered as shared `patchLessonActions`:
  - `patch-evaluation` `{u, v}` or `{u, v, w}`, validated so `u+v+w = 1` within tolerance;
  - `patch-visibility` (`control-net`, `iso-curves`, `boundary-curves`, `decasteljau-scheme`, `tangent-plane`, `normal`, `shading`);
  - `patch-subdivide` `{direction, value}`;
  - `patch-elevate` `{direction}`;
  - `camera-preset` `{view}`;
  - `u`/`v` sweep animations.

  Scenes stay synchronous within one tick.

## Localization

Slovenian is the default. `sl.ts` and `en.ts` stay in lockstep with typed keys.

**Terminology.** Decided 2026-10-26: the owner chose the family name and delegated the rest after a source search. Use these terms consistently in UI, chapter, lessons and the glossary. The canonical term list is the [localization table](../localization.md#approved-mathematical-terminology); this table keeps the sources and reasoning. Two conventions apply:

- **Adjective spelling:** *Bézierjev-* (*Bézierjeva krpa*), matching the app's existing copy (about 100 uses vs 1 *Bézierov-*) and FMF usage. Some FRI graphics material writes *Bézierova krpa*; do not mix the two.
- **Patch vs surface:** *krpa* is the patch, a single parametric piece; *ploskev* is a surface in general, for example several patches together or "parametrična ploskev".

| English | Slovenian | Basis |
| --- | --- | --- |
| Bézier patches (family) | **Bézierjeve krpe** | Owner decision |
| Bézier patch | **Bézierjeva krpa** | Owner decision; FRI graphics handouts use *krpa* |
| tensor-product patch | **tenzorska Bézierjeva krpa**; in definitions, *krpa v obliki tenzorskega produkta* | FMF CAGD syllabus "tenzorski produkti"; Šadl Praprotnik (2021) "tenzorske … Bézierjeve ploskve" |
| triangular patch | **trikotna Bézierjeva krpa** | FMF CAGD syllabus "trikotne krpe"; Šteblaj (2023) keyword "trikotne Bezierjeve krpe". The owner rejected bare *trikotna krpa* as the family name; the full form with *Bézierjeva* is used for the kind. |
| bilinear / biquadratic / bicubic patch | **bilinearna / bikvadratna / bikubična Bézierjeva krpa** | FRI handouts "bilinearna krpa", "bikubična Bézierova krpa" (spelling aligned) |
| control net | **kontrolna mreža** | FRI handouts "kontrolna mreža šestnajstih točk"; parallels the app's *kontrolni poligon* |
| boundary curve | **robna krivulja** | Jaklič & Kanduč (FMF) "robne krivulje vsake trikotne krpe" |
| iso-curve (isoparametric curve) | **izoparametrična krivulja** | diameter.si *Krivulje in ploskve* "izo-parametričnih krivulj". Prose may say *krivulja pri stalnem \(u\)* |
| parameter domain | **parametrično območje** (unit square / reference triangle: *enotski kvadrat* / *referenčni trikotnik*) | Chosen; standard analysis wording |
| barycentric coordinates | **baricentrične koordinate** | Standard |
| partial derivative | **parcialni odvod** | Standard |
| tangent plane / normal | **tangentna ravnina** / **normala** | Standard |
| twist vector | **mešani odvod** (on first mention: *mešani odvod oz. vektor zasuka, angl. twist*) | No Slovenian source found. The mixed partial \(S_{uv}\) is standard calculus vocabulary, so it is primary; *vektor zasuka* is a gloss only. |
| degree elevation / subdivision / convex hull | **višanje stopnje** / **subdivizija** / **konveksna ovojnica** | Existing app terms |
| C0/C1 join, G1 | **zveznost C0/C1**, **geometrijska zveznost G1** | Existing app terms |

Sources:
- FMF *Računalniško podprto (geometrijsko) oblikovanje* syllabus (fmf.uni-lj.si, programme 2MATE, course 364);
- FRI *Računalniška grafika: Krivulje in ploskve* handouts (itzsimpl.info/lectures/CG/L4-curves&patches_handouts.pdf, 2012);
- M. Šteblaj, *Predstavitev polinomskih krivulj in ploskev s principom razcveta*, MSc thesis (UL FMF, 2023, RUL repository);
- A. Šadl Praprotnik, FMF seminar abstracts (2021);
- T. Kanduč, FMF seminar abstract;
- diameter.si *SciQuest*, ch. 31.

The FMF pages were seen only as search-result excerpts: their TLS certificate failed verification, so they were not fetched.

## Acceptance criteria

**P1 — JSXGraph upgrade parity.** Complete 2026-10-26: JSXGraph 1.14.1 with passing checks and exact representative visual parity; see [acceptance audit](../reviews/bezier-patches/jsxgraph-upgrade.md). JSXGraph is at the latest 1.x release. The following all pass or have recorded, owner-accepted differences:
- unit, type, lint and production-build checks;
- the transient-state contract;
- figure export (SVG/PNG with MathJax labels);
- preview capture validation;
- the full browser smoke checklist.

No surface code ships in this change.

**P2 — Renderer decision.** An ADR records the chosen renderer and its rejected alternatives. It is backed by a spike that covers a bicubic and a cubic triangular patch (net, iso-curves, de Casteljau construction, shaded faces, orbit, drag, `z` drag, export, Presentation mode). Frame-time measurements on desktop and the representative phone follow [performance-plan.md](../performance-plan.md), and the spike evidence is in `docs/reviews/bezier-patches/`. The ADR states the drag/orbit budget that later slices must meet.

**P3 — Shared kernels preserve curves.** Polynomial and rational curves delegate to the extracted kernels. Existing golden and curve tests pass with unchanged expectations. New dimension-parametrised kernel tests show identical 2D results and Bernstein-sum agreement in 3D. A deliberate kernel mutation fails them. The representative drag measurement does not regress beyond noise.

**P4 — 3D points without silent planar loss.** Curves over 3D points evaluate, subdivide, elevate and extrapolate correctly in 3D, checked against the Bernstein sum. Every planar-only entry point listed in the starting seams rejects a nonzero `z` by type or at runtime, with tests. 2D behaviour, Presets and version-stamp caching are unchanged.

**P5 — Patch mathematics.** Tests cover, for both patch types:
- de Casteljau agrees with the Bernstein sum;
- the basis sums to one;
- corners are interpolated;
- each boundary equals the curve from its boundary row or edge;
- affine invariance;
- subdivision pieces re-evaluate to the original;
- elevation preserves samples;
- partials match finite differences, and the normal is perpendicular to the partials;
- the C1 join condition gives matching cross-boundary derivatives;
- tensor/triangular cross-checks on degenerate or split configurations.

These include a fixed teapot-patch golden test.

**P6 — Family integration.** The family, its routes, catalog metadata, investigation prompts, posters and motion previews (orbit or parameter-sweep recipes with mathematical frame assertions), and the chapter all exist in both languages. Every demonstration has graph-owned lessons with smoke-coverage rows. Unknown or invalid routes behave as existing ones do.

**P7 — Interaction and accessibility.** Each of the following works by mouse, touch and keyboard at desktop/projection and narrow widths:
- orbit, preset views and reset;
- drag in the horizontal plane and along `z`;
- numeric `x, y, z` editing;
- point selection by index;
- the parameter-domain inset.

The graph remains prominent, and controls follow the one-home rule. The elderflower palette is kept, with colours distinguishable on a projector.

**P8 — Presets.** Save, load, delete, export and import work for both patch types, including the camera. Malformed files get actionable localized errors. Existing Presets and files still load.

**P9 — Content quality.** Chapter prose and lessons pass `lessonMathNotation.test.ts` and pass mathematical review. Each listed misconception is addressed. Slovenian copy uses the terminology table consistently, including the *Bézierjev-* spelling and *krpa* vs *ploskev*.

**P10 — Documentation.** These are updated:
- capabilities, current architecture and `docs/ui-functionality.md`;
- the glossary (domain terms only);
- the ADRs for P2.

The roadmap records 3D points as delivered by P4. The owner's 3D-points idea is not yet written in `docs/roadmap.md`.

## Verification and delivery

Start with `just --list` and [commands](../commands.md). Each task names its focused checks. Integration runs `just check` and browser verification through the smoke-tester skill and [checklist](../smoke-tests.md). Task 01 and the first patch demonstration run the full checklist, because they touch every board and add a new workspace kind. Mathematical and engineering reviewers, plus UI/accessibility review for controls, review each multi-file slice under AGENTS.md. Acceptance evidence goes in `docs/reviews/bezier-patches/`. Implementation completion and acceptance are separate statuses.

## Task sequence

1. **[01](../tasks/bezier-patches/01-jsxgraph-upgrade.md):** JSXGraph upgrade (P1).
2. **[02](../tasks/bezier-patches/02-renderer-spike.md):** renderer spike and ADR (P2). Depends on 01.
3. **[03](../tasks/bezier-patches/03-shared-kernels.md):** shared curve kernels (P3). Independent of 01 and 02.
4. **[04](../tasks/bezier-patches/04-3d-points.md):** 3D points with planar guards (P4). Depends on 03.

Later tasks are created after 02's ADR:
- patch geometry (P5);
- the surface-view adapter and `patch-tensor`, with Presets (P7, P8);
- `patch-triangular` with the inset;
- the remaining demonstrations;
- chapter, lessons and previews (P6, P9);
- integrated acceptance (P10).
