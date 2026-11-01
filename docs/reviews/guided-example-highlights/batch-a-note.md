# Batch A (task 03) note for task 05

Date: 2026-11-01. Chapters `bezier-curves` (03a), `foundations`, `rational-curves` and `splines` (03b). Source: [task 03](../../tasks/guided-example-highlights/03-batch-a.md), [spec](../../specs/guided-example-highlights.md).

## Delivered

| Chapter | Cards | Highlight recipes | Kept start scene (reason) |
| --- | --- | --- | --- |
| bezier-curves | 12 | 9 | `convex-hull`, `quartic-interpolation` (audit: start is best); `decasteljau-parameter` (one synthetic step, t = 1/4 not reachable) |
| foundations | 3 | 1 (Bernstein stacked area) | `complex-multiplication` ("Show product" is a button no step kind can press); worked-weight degree comparison (family card is the start scene) |
| rational-curves | 7 | 5 (rational de Casteljau, extrapolation to 1,2, Farin points, elevation, subdivision at 1/2) | worked-conic `circle` (step 1 is the default circle) |
| splines | 6 | 5 (C¹ tangent, C² joints, G¹ at b = 1, symmetric G¹ at β₁ = 1/4, Cⁿ extrapolated point) | worked-join parabola derivatives (prepared fixture, no lesson frame) |

Section figures removed in these chapters (audit §3 rows 1–6): Bernstein, complex multiplication, rational, circle, spline C¹, spline G¹. Their distinctions now live in SL/EN prose (`094660ce`); chapter tests assert zero figures and the absorbed sentences.

Commits: 03a `6fbf16da` (pushed); 03b `094660ce`, `c048d198`, `20ff9011`, `6f569214`.

## Evidence (03b, revision 20ff9011 unless noted)

- Checks: every new expectation helper was mutation-checked by its worker (logs `docs/reviews/feature-streams/learn-ui/logs/03b-A-mutations.log`, `03b-B-mutations.log`). The handler recomputed the rational de Casteljau rows, elevation Q₁, subdivision weights and shared point, the extrapolation tail end R(1,44) ≈ (−0,51; −3,23), and the C¹ join derivative.
- Capture: full `capture-guided-example-previews.cjs` run against the production preview passed every recipe's board check. Only the eleven 03b recipe PNGs changed. The handler viewed each image and corrected the alt text and captions where they disagreed with it: no point labels are visible in the spline images; the extrapolation image shows three of the four control points (w₂ = 0,52 is off-view) plus the preview tail; the rational de Casteljau curve is drawn only up to t = 0,5.
- `just check` (typecheck, lint, all unit tests, build) passed at 094660ce+dirty, equal to the 20ff9011 tree. After `6f569214`: content unit suite, typecheck and lint of the touched files passed.
- Smoke (`bezeg-smoke`, Sonnet; screenshots in [batch-03b-smoke/](batch-03b-smoke/)): 1280 and 390 px, SL and EN with live switch. Passed: zero section figures, all card images decode with alt and caption, no horizontal overflow, no console errors, "Return to chapter" lands on the owning section with focus on the launching link.

## Gaps and findings for task 05

- The lesson's own Exit button leads to the workspace route, not the chapter. This is the existing design; the chapter return path is the "Return to chapter" link. Not verified against the spec's keyboard launch/return wording.
- Card readability at 390 px was viewed by the handler for one chapter (rational-curves, SL) only. Projection size, enlarged text, keyboard-only launch and Back/Forward were not covered; they are in task 05's full smoke.
- Rational subdivision image: the weight labels of the two pieces overlap at the shared point (w₃ = 1,38 of the left piece and w₀ = 1,38 of the right). This comes from the graph's own labels; same value, not fixed.
- Out of scope, found in 03a and seen again in the rational extrapolation image: after Extrapolate the graph draws the curve on to `extrapolationT`, a preview tail past the new end (`AbstractJXGBezierCurve.ts:359`). Captions name the tail.
- Fixed during 03b smoke review: the `investigate-rational` sentence rendered `0letle1` (single backslashes in a TS string, since `cd4c26f2`); a new family-chapter test rejects bare TeX command names inside inline math.
- Master CI: runs on `27dc4f7a`, `7dfb7a5d` and `d19b8586` fail `demonstrations.smoke.spec.cjs` preview-map tests because seven computational-geometry demonstrations (convex-hull, ear-clipping, interval-sweep, linear-map, orientation, polygon-area, segment-intersections) have no generated preview. This predates batch A and belongs to the geometry stream.
