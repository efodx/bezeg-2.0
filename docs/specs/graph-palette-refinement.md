# Graph palette refinement

Status: implementation authorized by the owner, 2026-11-03. Source: [aesthetic review](../reviews/graph-aesthetics-2026-11-03/report.md), the owner's Delaunay/orientation/polygon-area card screenshots, and the subsequent request to find and fix further examples. Continue in this chat; the owner explicitly waived context handoffs and successor creation for this task.

## Scope and visual direction

First release: Voronoi, CLT, B-spline insertion, complex reciprocal, Fourier coefficients, Delaunay, orientation and polygon area. Preserve the cream canvas and elderflower shell. Replace muddy region washes with clean, light categorical or signed fills; keep strong color on meaningful boundaries, inputs/results and comparison curves. Reduce heavy brown/orange emphasis and comb texture. Match legends to board objects, retain dash/marker/sign distinctions, and make the shipped card media reflect the actual graphs.

Second release, after the first commit and push: inspect current native-size previews and representative lesson states for related problems. Select and record a bounded set of concrete additional examples, then fix, verify, commit and push those. Linear-map grids and Euler slope fields are strong existing leads; avoid an unbounded redesign of all demonstrations.

## Acceptance criteria

1. Voronoi cells have clean separable light fills, clear boundaries and a recognizable highlighted cell. Keep exact clipping, unbounded markers, nearest-site/tie behavior and duality geometry.
2. CLT's distribution and normal reference differ in hue and line pattern, including when nearly coincident; preserve convergence and every computed sample. B-spline insertion's curvature comb becomes quieter, without deleting or resampling teeth/envelope or changing knots/shape.
3. Complex reciprocal uses coherent input/derived-result families; all result labels, existing marker shapes, dashed distinctions, undefined states and inversion geometry remain. Fourier's main/reference/sum roles and signed areas have a clearer hierarchy, including decay view; legends match both views.
4. Delaunay's illegal-edge/circumcircle scene loses the heavy ochre diagonal and muddy triangle wash while retaining the explicit illegality readout, endpoints, flip, selected triangle and circle. Orientation and polygon-area use cleaner signed fills, readable values and existing geometric boundaries. Both turn/area signs, reverse, drag and overlay toggles remain correct; preserve the recently added fan diagonals and label backing.
5. No algorithm, scene sequence, coordinates, evaluation, preset format, route, hit target or app-shell change. No global palette replacement that silently changes unrelated graphs. Audit lesson color prose and update both languages only if its stated meaning changes. Drawing changes must reach exports.
6. Capture matched before/after native cards and representative audited lesson states. Regenerate every affected catalog poster and any existing motion entry from a fresh production build, retaining explicit provenance for unaffected assets. Inspect desktop, 724px and 390px results; confirm controls, scene retention across language, keyboard, an edited scene and actual SVG/PNG exports in delegated browser smoke.
7. Run focused existing host/geometry checks, lesson math notation, TypeScript, lint and production build. A full unit run is required once at a stable release checkpoint, with failures and coverage gaps stated. Review this multi-file presentation change independently for engineering constraints and rendered UI. Record source/build revision, concrete evidence and limitations under `docs/reviews/graph-palette-refinement/`.

## Compatibility

Presentation changes only: current routes and saved presets remain valid. Sign, category and input/result meanings survive through labels, shapes, patterns and position; color descriptions must remain truthful. No renderer or performance optimization is proposed.

## Second release selection

The first release was pushed as `6c0c6a28` before this inspection began. Matched current scenes confirm two further cases: linear-map step 3/6 has a dark olive transformed grid competing with its mapped curve and unit square; Euler-method step 4/7 frame 1 has a pervasive sage field competing with the solid approximation and dashed exact solution. Native posters repeat both problems.

- Linear map: use cool, quieter source/transformed grid roles with stronger mapped handles/curve and a clean light square fill. Separate background-grid styling from foreground point styling; retain every grid line, transformed coordinate, source/image relationship and square boundary. Preserve basis labels and all mode-specific constructions.
- Euler: use a quiet cool slope field, a strong blue approximation and a warm dashed exact reference. Preserve every field mark, its slope and screen-size sampling, all Euler nodes and crosses, initial point and readouts. Match all legend entries and retain exact-solution visibility.
- The handler screened twelve further native posters and inspected ear clipping at step 3/7 frame 2 and the completed triangulation at step 4/7 frame 1. Add ear clipping: its completed olive triangles repeat the owner's muddy orientation/polygon-area examples, and its active candidate uses a heavy ochre wash. Use clean mint clipped triangles, a pale warm candidate and a quiet cool triangulation underlay. Preserve every triangle/border/diagonal, invalid-candidate dash/cross, reflex marker, three-color letter/shape and guard cue; do not recolor the combinatorial coloring or change the algorithm/trace. No further candidates are included in this release. [Scan evidence](../reviews/graph-palette-refinement/phase2-scan.md).

Use the first-release build frozen on port 4328 for matched baseline captures. Reuse the first release's full-unit checkpoint for unchanged infrastructure; run the affected graph/model/host suites, notation, TypeScript, lint and production build on the final second-release source. Refresh affected catalog media and check controls, narrow rendering, actual export and the mathematical readouts. Require independent engineering/drawing and rendered UI review before the second commit and push.

## Release record

First release accepted locally on 2026-11-03 23:24:56 UTC: all eight owner-selected examples, two shared Voronoi consumers, matched captures, refreshed catalog media, engineering review, browser controls/exports and full unit checkpoint. [Implementation and evidence](../reviews/graph-palette-refinement/phase1.md); [browser coverage and limits](../reviews/graph-palette-refinement/browser-review.md). Published with this record. Second release selection begins after that commit and push.

Second release accepted locally on 2026-11-03 23:51:27 UTC: linear map, Euler method and ear clipping, following the pushed first release `6c0c6a28`. [Selection, implementation and verification](../reviews/graph-palette-refinement/phase2.md), including native comparisons and the partial independent browser lane completed by direct handler checks. No further implementation remains in this bounded request.
