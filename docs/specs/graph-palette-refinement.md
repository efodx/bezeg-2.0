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

## Release record

First release accepted locally on 2026-11-03 23:24:56 UTC: all eight owner-selected examples, two shared Voronoi consumers, matched captures, refreshed catalog media, engineering review, browser controls/exports and full unit checkpoint. [Implementation and evidence](../reviews/graph-palette-refinement/phase1.md); [browser coverage and limits](../reviews/graph-palette-refinement/browser-review.md). Published with this record. Second release selection begins after that commit and push.
