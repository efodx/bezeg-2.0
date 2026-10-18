# Continuous motion previews

Status: implemented for all 45 previews on 2026-10-18; see the [all-preview expansion](#all-preview-expansion-owner-request-2026-10-18). Proposed 2026-10-16 after the owner singled out the Bézier control-point clip. The phase records below preserve earlier scope decisions; the all-preview request supersedes their exclusions.

Extends [representative demonstration previews](representative-demonstration-previews.md) (the base spec). Everything in the base spec still applies unless this document says otherwise: capture approach, single camera per clip, poster fallback, shared graph-free player, visible-only loading, reduced motion, manifest provenance, and the 300 KiB per-clip budget.

## Reopened clips (owner decision 2026-10-18)

The owner reversed the 2026-10-17 decision recorded in `b8d48b8`: ship motion previews for `ph-quintic` and `subdivision`. `rational-decasteljau` remains dropped. The historical Phase 3 record below describes the earlier decision.

The same day's [hover-only playback request](hover-motion-previews.md) supersedes automatic visible playback for all clips. Existing loading, cleanup and fallback requirements still apply behind hover/focus activation.

- `ph-quintic`: retain the exact PH curve and one offset, but choose a visibly useful cusp-free distance sweep, with a measured fixed camera. Its capture-only recipe/poster may change to match the start/end distance and framing. Verify the signed normal offset, fixed base curve/control points and cusp margin throughout.
- `subdivision`: change the capture-only recipe/poster to the pre-Subdivide construction, with supporting polygon, interpolation construction and both coloured portions visible. Sweep the split parameter away from and back to its recipe value without pressing Subdivide. Verify the split point equals B(t), the interpolation construction, and unchanged control points/base geometry.
- Acceptance: both clips satisfy criteria 1–8 below, including identical first/last recipe frames, 4 s at 720×440, ≤300 KiB each, recorded provenance, card-size review and desktop/390px smoke. Changes to these two capture-only recipes/posters are explicitly allowed; runtime routes, defaults, presets and lessons stay unchanged. Existing clips retain their source-frame evidence.

### Capture and verification record

Implemented 2026-10-18. Both clips are 96 frames at 24 fps, silent, 720×440; each poster's SHA-256 equals its first and last source PNG hashes. The library now has 20 clips. The 43 untouched poster records/files and all 18 existing motion records/files are identical to the previous published set.

| ID | Path | Encoder | Size |
| --- | --- | --- | --- |
| `ph-quintic` | `d`: 0.5 → −0.5 → 0.5 | CRF 10 | 247,040 B |
| `subdivision` | `t`: 0.5 → 0.745 → 0.255 → 0.5, pre-Subdivide | CRF 16 | 279,977 B |

The PH quintic poster now uses `d = 0.5` so the offset separation is useful at card size. The signed-side cusp radius converges to 0.800357422 at 4k/40k/400k curvature samples, leaving about 0.30036 clearance; signed-normal distance/perpendicularity and the fixed base curve are asserted at 41 parameters each frame. Subdivision's poster now shows the original polygon and interpolation construction, with the two coloured portions meeting at B(t), rather than committed split pieces. Its native slider grid is 0.01 + k·0.0098; the two-decimal accessible readout is checked within half a display unit while the input and geometry are checked at their full values. Each portion is checked at 21 parameters against the original cubic; construction points and fixed controls are checked independently. The moderate sweep and CRF 16 keep the clip readable within budget (CRF 10 measured 382,499 B). No route, preset or lesson behavior changed.

Selective recapture retains unchanged assets and source-frame evidence, verifies their mathematical-source fingerprint and file checksums, and records old graph/presentation provenance and retained groups. Its explicit presentation-verification flag was used after reviewing that the shared presentation and existing clip specifications were unchanged; the motion-script hash changes when new specifications are added.

Focused capture tests pass 31/31, including real VP9 encoding. Player/image tests, the App test, TypeScript and the production build pass. The production Chromium smoke run passes 65 checks across motion playback, homepage, catalog and all 45 demonstration mounts, including both new clips at desktop/390px, hover/focus, reduced motion, offscreen cleanup, failed/delayed media, picker and carousel parity. Independent mathematical and player engineering reviews found no remaining blockers. The build retains the existing Sass deprecations, large-chunk and JSXGraph eval warnings. Independent card-size browser review is recorded on completion in [hover playback](hover-motion-previews.md).

## All-preview expansion (owner request 2026-10-18)

The owner requested motion for every preview unless there is a concrete reason to retain a still. This supersedes the earlier candidate restrictions, dropped-clip decisions and exclusions for discrete counters and reveal demonstrations. Inventory all 45 shipped demonstrations, including the 25 without clips at the start of this expansion. Use continuous supported-input changes where they explain the concept, and exact stepped states for inherently discrete constructions. Retain a still only when motion would misrepresent the mathematics, obscure the defining result, lack a supported control, or fail the existing readability/size budget; record the individual reason and evidence.

The existing acceptance criteria 1–8 apply to every added clip. Capture-only recipe and fixed-camera changes are allowed where necessary to make the concept visible, with the corresponding poster updated. Runtime routes, defaults, presets, lessons and graph code remain unchanged. Existing clips and their source-frame evidence are retained. Hover/focus activation and reduced-motion posters remain the playback contract. Completion requires accounting for all 45 entries with a verified clip or an individually justified still.

### All-preview capture record

The expansion covers all 45 demonstrations, with no still-only exceptions. The 25 additions use the following supported controls; the existing 20 clips retain their files and source-frame evidence. Every addition has 96 frames at 24 fps, a four-second silent 720×440 WebM, one fixed camera, and identical first/last source PNGs matching its poster. The manifest records the individual byte counts, encoder arguments, schedules and mathematical observations.

| Added ID | Input and path |
| --- | --- |
| `bernstein` | Degree 3 → 4 → 3, exact held states |
| `extrapolation` | Extension parameter 1.2 → 1.3 → 1.2 |
| `rational` | Control point p1 moves by (+0.55, +0.65) and returns |
| `rational-decasteljau` | Prefix parameter 0.5 → 0.7 → 0.3 → 0.5 |
| `rational-extrapolation` | Extension parameter 1.2 → 1.3 → 1.2 |
| `rational-subdivision` | Pre-Subdivide parameter 0.5 → 0.745 → 0.5 on the native grid |
| `circle` | Arc count 3 → 4 → 3, exact held states |
| `spline-cn` | Continuity order 1 → 0 → 1, degree 2 fixed |
| `spline-c1` | Endpoint p0 moves by (+0.55, +0.45) and returns |
| `spline-c2` | Endpoint p0 moves by (+0.45, +0.35) and returns |
| `spline-g1-symmetric` | First join parameter 0.1962 → 0.8038 → 0.1962 on the native grid |
| `spline-parameterization` | α: 0.7 → 0.3 → 0.7 |
| `uniform-parameterization` | Uniform PH sample count 10 → 22 → 10 |
| `linear-function` | Slope 2 → −0.5 → 2, intercept fixed |
| `exponential-function` | Base 2 → 0.5 → 2 |
| `continuity` | Join parameter 1 → 1.5 → 1 |
| `area-between-curves` | Right bound 3.2 → 2 → 3.2 |
| `arc-length` | Polyline segment count 2 → 12 → 2 |
| `mean-value` | Tangency point 1 → 1.8 → 1 |
| `extrema` | Left bound −1 → 1 → −1 |
| `convexity` | Tangency/comparison point 0.5 → 1.4 → 0.5 |
| `taylor` | Polynomial degree 2 → 8 → 2 |
| `sequence` | ε: 0.1 → 0.3 → 0.1 |
| `uniform-convergence` | Index 5 → 25 → 5 |
| `fixed-point` | Initial value 0 → 0.8 → 0, with five supported iteration steps reapplied after each change |

Decisions and mathematical checks:

- Rational de Casteljau's observed board does not expose intermediate construction points. Its capture explicitly sets the supported parameter and shows the growing rational prefix, independently checked over the entire interval `[0,t]`, ending at the rational Bernstein evaluation `R(t)`. Its metadata makes no interpolation-level claim. This replaces the earlier dropped decision with a visible parameter-tracing concept.
- The two extrapolation recipes retain the original control representation instead of pressing Extrapolate. Showing the extrapolation point already extends the rendered interval to `[0,t]`. Both the complete rendered interval and its endpoint are checked independently. The moderate sweep and measured fixed windows preserve geometric proportions and keep the extension visible. Rational subdivision uses its live pre-Subdivide construction; no pieces are committed.
- Spline α changes knot-dependent C2 construction points and the spline shape, as well as the markers. The independent C2 construction/evaluator agrees with runtime geometry on 2,005 reference evaluations at five α values, with maximum error `6.72e-15`. The clip checks the curve and each marker against that reference; only the free points remain fixed. Uniform parameterization uses a PH curve with no main-board draggable controls, so its existing sample-count slider demonstrates equal arc-length spacing at different densities instead.
- Bernstein checks every basis formula and partition of unity over the full domain. Circle checks radius, shared endpoints, each signed arc angle and total winding of one turn. Negative fixtures reject constant basis partitions and collapsed circular arcs. Cn records the actual continuity counter and rejects a stationary middle state. Spline continuity is checked at exact join parameters: position limits use a parameter displacement of `1e-8` and tolerance `1e-5` (measured maximum gap `3.20e-7`); first-derivative differences use `h = 1e-4` and tolerance `0.03` (measured maximum `0.01257`). C2 second derivatives are checked too.
- Pointer clips verify the intended control's excursion, unchanged other controls, changing rendered SVG paths and exact return through supported pointer dragging. Number inputs parse Slovenian decimal commas. The area recipe uses an exactly editable bound of 3.2 instead of the default irrational intersection, whose two-decimal field cannot restore the original value exactly. The linear capture window adds lower-axis context. These are capture-only changes.
- New captures reapply presentation through an exact fixed camera. Repeated JSXGraph camera application can round a bound by one ULP; the numeric camera tolerance is `1e-10`, far below a pixel, while poster/loop PNG hashes remain exact. Extrema's legitimately conditional objects are checked by stable object ID for unchanged stroke widths. Source/decoded background checks use a clear `(40,40)` pixel for analysis clips to avoid a one-level lossy edge discrepancy at the corner.
- The default CRF is 10. Rational dragging and spline α use CRF 16; extrema uses CRF 26 after CRF 10 and 18 exceeded the existing size limit. No clip budget or application dependency changed. Independent review of all 25 additions at 360×220, using five frames per clip, found no actionable clipping, annotation collisions or loop jumps.

The selective capture's presentation-verification flag is justified by unchanged presentation for the retained 20 clips: exact-camera handling is optional or restricted to the additions, and the geometric-window whitelist additions affect only the two new extrapolation clips. Both family specification modules now participate in the presentation fingerprint. Runtime routes, defaults, presets, lessons and graph code are unchanged.

Validation confirms all 45 clips are within 300 KiB (largest 301,595 bytes), totaling 7,996,099 bytes. The existing 20 motion records/files and their poster records are unchanged. The manifest retains every numeric sample and source/path hash; unused duplicated SVG path strings are omitted for the additions. Equivalent cameras within `1e-10` are canonicalized to the poster metadata after verification. Production entry JavaScript grows by 3,697 bytes (3,828 bytes gzip) for the asset mapping; video remains loaded only on activation.

Focused capture tests pass 44/44, including real VP9 encoding. TypeScript, the production build and focused app/player tests pass. Mathematical and engineering reviews found no remaining blockers. The build retains existing Sass deprecations, large-chunk and JSXGraph eval warnings.

The production Chromium smoke suite passes 66/66 checks: all 45 desktop clips and all 25 additions at 390px decode; hover/focus, reduced-motion posters, offscreen cleanup, delayed/failed media, picker/carousel parity, catalog navigation and every demonstration mount pass. Its offscreen test now scrolls back to the top of the document and verifies that the final card unloads: the previous bottom-of-document assumption stopped being valid when the last card gained motion.

Manual production-browser review confirms visible playback for linear, rational de Casteljau, circle, spline α, uniform parameterization and PH previews at 1440×900, keyboard focus/blur poster restoration, and fitting linear/circle cards in the one-column 390×900 catalog. The console was clean. Manual reduced-motion emulation was unavailable, covered by the automated suite; graph dragging was skipped because graph code is unchanged. The temporary browser tab was closed and its filters/viewport restored.

## Original problem

Six demonstrations have clips. Only the Bézier one is continuous. The pointer drags one control point, and every frame shows the real curve recomputed from the moved point. Repeated subdivision, bisection, affine and the elevations step between held states. Continuous change is what makes the Bézier preview work: viewers see cause and effect, not a before/after pair. Several other demonstrations have a single input whose continuous change *is* the concept: a parameter `t`, a weight, the step `h`, the parameterization `α`, the multiplier `w`, the upper bound `x`. They currently show one still.

## Scope

Add continuous clips (and two stepped clips) to the demonstrations below. Use only existing controls and the existing capture pipeline.

### Change to the base spec's constraints

The base spec allows movement only for "isolated recorded Bézier movement and existing affine transformations". This spec also allows the bounded, capture-only motions listed in the tables below. Each one:

- starts from the demonstration's existing recipe state (the same state as its poster), and the first and last frames match that state, so the loop is seamless;
- changes only the named input, through a supported control (a range input via keyboard, an on-board point, glider or slider via pointer, or a number field);
- never changes route defaults, presets, lessons, worked examples, the starting curve or function, or any input other than the named one.

Implementers update the base spec's scope paragraph and pilot list to point here when the first clip ships.

### Out of scope

New runtime controls or mathematical features, runtime animation playback (the de Casteljau Play button is not used), new encoder or application dependencies, carousel choice or timing changes, a bigger clip budget (see Budgets), and stepped clips for discrete counters (circle pieces, spline-cn degree, Bernstein `n`). Mean value, extrema and convexity keep their reveal stills.

## Motion modes

Add two capture modes beside the existing ones in `scripts/demonstration-preview-motion.cjs`. Generalize the Bézier-specific branch rather than copying it. The modes are capture tooling only. No production `window` bridge and no React internals.

1. **Parameter sweep** (`parameter-sweep`): a range or number input follows a deterministic schedule `value(i)` for `i = 0..95` (96 frames at 24 fps, 4 s). Snap each value to the control's step and reach it through the supported control. Keyboard stepping matches the existing `applyAction` range path. Stepping incrementally from the previous frame's value is allowed, provided each frame asserts the input's actual value. After every frame, check that the graph-reported value (readout, `aria-valuetext` or board text) equals the snapped target.
2. **Pointer drag** (`pointer-drag`): like the Bézier capture. Map board coordinates to screen coordinates every frame, press the pointer on the handle once, move it along the scheduled path, and release. After release, restore the exact start state through a supported exact input (for example a number field or the coordinate editor) when one exists. Otherwise the final frames must be checked against the start state within the control's snap tolerance.

Schedules use the Bézier easing: hold about 12 frames at the start value, ease out and back with `sin²` over about 71 frames, then hold about 13 frames at the start. A demo may use a different symmetric profile (for example a full cycle for `α`) if it is recorded in the manifest. The clip must never jump between its last and first frame.

Evidence for each frame goes into the manifest: index, scheduled target, actual control value, positions of every input that is supposed to stay fixed, and the hash of the curve or function path. Mode name, schedule and invariants are recorded per clip.

## Candidates

### Phase 1: pilot (one mode each)

| ID | Motion | Start / path | What it teaches | Per-frame invariants |
| --- | --- | --- | --- | --- |
| `decasteljau` | Sweep **construction parameter `t`** (range 0–1, step 0.01) | Recipe state (whole-curve off, polygon on). `t`: start → 1 → 0 → start, or 0 → 1 → 0 if the poster is moved to `t = 0`; record which. | The interpolation levels slide along the polygon and the curve point traces the curve. | Control points unchanged (1e-9). Intermediate points equal a pure de Casteljau evaluation at the reported `t` (1e-9). The final point lies on the full curve. Partial-curve path changes when `t` changes. |
| `farin` | **Pointer drag** of one Farin slider glider along its control edge | Recipe state (Farin points and weights on). Move one interior edge's glider from its starting ratio toward about 0.8 of the edge and back. | Changing a weight ratio pulls the curve toward or away from the polygon. | Control points unchanged. Only that edge's weight ratio changes. The other ratios stay unchanged (1e-9). Displayed weight text matches the curve's effective weights. Curve path changes mid-drag. The final state's weights equal the starting weights (within glider snap tolerance, or exactly if restored). |
| `derivative` | Sweep **step `h`** (range −2 to 2, step 0.01, \|h\| ≥ 0.01) | Recipe state (tangent shown). `h`: start → 0.05 → start. Never cross the excluded band around 0. | The secant becomes the tangent: the limit definition. | `x0` and the function unchanged. `Q = x0 + h` lies on the graph. The secant slope equals the difference quotient at the reported `h` (1e-9). The tangent stays fixed. |

### Phase 2: rest of the strongest matches

| ID | Motion | Start / path | What it teaches | Per-frame invariants |
| --- | --- | --- | --- | --- |
| `weighted-parameterization` | Sweep **`α`** (range 0–1, step 0.01) | Recipe value 0.25 → 0.75 → 0.25, one full cycle. | Same curve, different parameterization: the markers bunch and spread. | The **curve path hash is identical in every frame**. Control points unchanged. Each marker equals `B(φ_α(t_k))` for the reported `α` (1e-9). |
| `complex-multiplication` | **Pointer drag** of `w` once around the unit circle | Recipe state (`rotation-i`, product and arguments shown). Path `w(θ) = e^{iθ}` starting at `θ = π/2` and doing one full revolution, so the loop is seamless. Drag positions snap to the 0.05 grid. | Multiplication rotates: `arg(zw) = arg z + arg w`. | `z` unchanged. `w` equals the grid-snapped target. Product equals `z·w` (1e-9). The final `w` equals the starting `i` exactly. |
| `accumulation` | **Pointer drag** of `x` along the axis | Recipe state (accumulation revealed). `x`: start → start + about 2.5 (inside the recipe window and [−7, 7]) → start. | The signed area grows while `A(x)` traces the accumulation function. | `a` unchanged. Readout `A(x)` matches the pure accumulation function at the reported `x`. Restore `x` exactly through its number field. |

### Phase 3: further fits (owner review gate)

Start only after the owner has reviewed Phases 1–2 at card size.

| ID | Motion | Notes / invariants |
| --- | --- | --- |
| `decasteljau-alternative` | `t` sweep, as in `decasteljau` | Both component-curve points and the connecting segment are recomputed. The curve point lies on the connecting segment at ratio `t`. |
| `rational-decasteljau` | `t` sweep | Weights unchanged. The curve point equals the rational evaluation at `t`. |
| `ph-cubic`, `ph-quintic` | Offset distance `d` sweep (range −3 to 3, step 0.01): 0 → recipe value (0.35 / 0.2) → 0 | PH curve path is identical in every frame. Offset count is fixed. Keep `d` small enough that the offsets have no cusps in the framing window. |
| `spline-g1` | `β₁` sweep inside its range, around the recipe value 0.65 | Shared tangent direction at the join is preserved in every frame (direction check to 1e-9). Only that join's leg changes. |
| `subdivision` | Split `t` sweep (0.01–0.99) **before** pressing Subdivide | Split point lies on the unchanged curve. Do not press Subdivide during the sweep. |
| `trigonometric-functions` | `φ` sweep −π…π (step π/12, stepped holds) | `A`, `ω`, `B` unchanged. Optional; drop it if the clip adds little at card size. |
| `definite-integral`, `darboux` | **Stepped** `n` = 1, 2, 4, 8, 16, 32 (existing discrete-steps mode, equal holds) | Integrand and interval unchanged. Rectangle sums match the pure Riemann/Darboux sums for the reported `n`. |

## Framing and presentation

- Use one camera per clip. Take the recipe's coordinate window when one exists. Otherwise take the union of meaningful geometry across all frames, computed in a measurement pass first. No refit between frames.
- The poster stays the recipe still. Do not change the poster to an intermediate frame unless the manifest records why.
- Moving annotations (weight text, readouts) must not overflow the frame or collide with the moving geometry at card size. If they do, apply the existing annotation policy (hide point names). Do not change runtime styling.

## Budgets

The base spec's 300 KiB per-clip ceiling stands. The current `bezier.webm` is about 286 KiB. A continuously changing scene is likely to be the hardest case. When a clip exceeds the ceiling with readable mathematics, try in this order: fewer moving labels through the existing annotation policy, a smaller motion amplitude, then encoder settings within the existing encoder. If it still exceeds, keep the poster, record the limitation, and report it. Do not raise the budget without an explicit owner decision recorded in this spec.

## Acceptance criteria

1. Each shipped clip comes from real settled route states captured through supported controls. Each passes its per-frame invariants above as assertions in the capture script, and `assertMotionEvidence` covers the new modes.
2. First and last frames equal the recipe state. A loop shows no visible jump.
3. Route defaults, presets, lessons, worked examples and graph runtime code are unchanged. Review the diff: only capture tooling, generated assets and manifest, `src/demonstrationMotionAssets.ts`, tests and docs change.
4. Each clip is at most 300 KiB, 4 s, silent, and 720×440. The manifest records mode, schedule, sample evidence, encoder settings and hashes.
5. The existing player behavior is unchanged and still verified: visible-only loading, reduced motion, poster fallback, catalog/picker/carousel parity.
6. Each phase: run the focused capture/manifest tests (`scripts/demonstration-preview-capture.test.cjs`), the preview player tests, `npx tsc --noEmit --pretty false`, and the production build. Smoke-test the catalog at desktop and 390px with `$smoke-tester`. Visually review every new clip at actual card size.
7. Math review (parallel subagent) confirms each invariant tests the right identity. A visual/accessibility review confirms readability and that no explanation is available only through motion.
8. Update `docs/capabilities.md`, `docs/current-architecture.md`, `docs/ui-functionality.md` and the base spec with the new clip count and list.

## Sequencing

1. Generalize the motion script into `parameter-sweep` and `pointer-drag` modes, keeping the Bézier clip byte-for-byte reproducible or re-verified.
2. Phase 1 (`decasteljau`, `farin`, `derivative`): capture, review at card size, and commit each clip separately with its evidence.
3. Phase 2: same process.
4. Owner review, then Phase 3 for the entries the owner selects.

Stop and report if a candidate needs a missing control, a runtime change, or a bigger budget, rather than working around it.

## Phase 1 record

Implemented 2026-10-17 in `scripts/demonstration-preview-motion.cjs` (`motionSpecs`, `captureSweep`, `captureDrag`, `assertMotionEvidence`). Every clip is 96 frames at 720×440, its last source frame equals its first, and its schedule, invariants and encoder reasoning are in the manifest.

| ID | Mode | Path | Encoder | Size |
| --- | --- | --- | --- | --- |
| `decasteljau` | `parameter-sweep` | `t` 0.5 → 1 → 0 → 0.5 | CRF 28 | 295,631 B |
| `derivative` | `parameter-sweep` | `Korak h` 1 → 0.05 → 1 on f(x) = x², x0 = 1, recipe window camera | CRF 22 | 250,909 B |
| `farin` | `pointer-drag` | glider of edge p1–p2, v 1/3 → 0.7 → 1/3 (ratio 1/2 → 7/3 → 1/2), exact restore through the weight number fields | CRF 14 | 259,057 B |

Deviations and decisions:

- `decasteljau` keeps the whole curve visible. The Phase 1 table says "whole-curve off", but the recipe and poster show it on, and the clip must start from the poster state.
- `farin` amplitude is 0.7 rather than about 0.8: 0.8 exceeded 300 KiB at readable CRF (328,205 B at CRF 10), and at 0.75 the curve crossed the `w₂` weight label around frames 39–57 at card size. At 0.7 the curve stays off the label. The static p2–p3 control edge touches the label's left edge in every frame, poster included; that comes from the recipe and JSXGraph's automatic label placement, not the motion, and is left unchanged.
- `bezier` was moved onto the shared `pointer-drag` path. Its 96 source PNG hashes, path hashes and decoded pixels are identical to the previous capture. WebM bytes differ run to run (libvpx), so reproducibility is checked on source frames and decoded pixels. Its moving-point tolerance of 0.035 is inherited from the original capture and recorded in the script as a known weakness.
- The farin glider tolerance (1e-6 in edge parameter) has about a 6× margin over the measured 1.6e-7 error.
- Recipe labels were repaired for the redesigned controls first; regenerated posters differ from the previous ones only by sub-pixel antialiasing.

Out of scope, reported to the owner: `DecasteljauAnimationControls.tsx` renders `t = 0.50` with a decimal point in the Slovenian UI.

## Phase 2 record

Implemented 2026-10-17. Same shared modes and evidence as Phase 1; the base and Phase 1 clips keep identical source frames.

| ID | Mode | Path | Encoder | Size |
| --- | --- | --- | --- | --- |
| `weighted-parameterization` | `parameter-sweep` | `Parameter α` 0.25 → 0.75 → 0.25 | CRF 10 | 167,065 B |
| `complex-multiplication` | `pointer-drag` | `w = e^{iθ}`, θ from π/2 through one full turn with a monotone `(1 − cos πx)/2` ease, snapped to the route's 0.05 grid, exact restore through Re w / Im w | CRF 14 | 287,913 B |
| `accumulation` | `pointer-drag` | `x` 2 → 4.5 → 2 (sin² out and back), snapped to 0.01, exact restore through Točka x | CRF 25 | 301,595 B |

Deviations and decisions:

- `complex-multiplication` recipe window bottom moved from −1.1 to −1.6. With z = 1 + i the product reaches Im(zw) = −√2, which the old window clipped for about ten frames. The poster reframes accordingly. The capture asserts that z, w and the product stay inside the window every frame. The `w` square briefly crosses the axis tick labels near frames 24 and 47; the annotation policy covers only point names and the clip must make a full turn, so this is left as is.
- `accumulation`: the `A(x)` caption lies outside the recipe window, as in its poster. The capture still asserts the caption text against an independent integral, and asserts the visible point on the accumulation graph equals `(x, cos a − cos x)`. While the pointer is held, JSXGraph samples the function graph more coarsely, so the integrand path is checked geometrically (every vertex on `y = sin x`) during the drag and by exact hash at rest. Its negative-area fill appears past π, so only this clip compares strokes per element. The clip is 98% of the 300 KiB ceiling at CRF 25.
- `weighted-parameterization`: at α = 0.75 the first marker sits close to the start control point at card size; they do not overlap.
- Path-present checks count only curves with non-empty path data (math review).
- Review dispositions: the math review confirmed each identity against the runtime source (φ_α, marker parameters, complex snapping and product, accumulation snapping and integral). Its notes on snap margins and the SVG path parser are covered by captures passing at 1e-9. The visual review found no loop jumps and no motion-only explanation.

The `tests/demonstration-motion.smoke.spec.cjs` loop check now polls every 100 ms. With 1 s polling against the 4 s clips it could sample only whole seconds and fail by phase; this failed CI on the Phase 1 push.

## Phase 3 record

Implemented 2026-10-17. The owner asked for Phase 3 without naming entries, so every table entry was attempted. Existing clips keep identical source frames; only the `spline-g1` poster changes (reframed, below).

| ID | Mode | Path | Encoder | Size |
| --- | --- | --- | --- | --- |
| `decasteljau-alternative` | `parameter-sweep` | `Parameter t` 0.5 → 1 → 0 → 0.5 | CRF 10 | 230,508 B |
| `ph-cubic` | `parameter-sweep` | `Razdalja odmika d` 0.35 → −0.35 → 0.35 | CRF 10 | 236,353 B |
| `spline-g1` | `parameter-sweep` | `Parameter b 1` 0.6379 → 1.5349 → 0.2492 → 0.6379 on the slider grid 0.01 + k·0.0299 | CRF 10 | 178,611 B |
| `trigonometric-functions` | `parameter-sweep` | `Faza φ` 0 → π → 0 on the π/12 grid | CRF 10 | 283,552 B |
| `definite-integral` | `discrete-exact-steps` | n 6, 12, 24, 48, 24, 12, 6 (holds 18/10/10/20/10/10/18) | CRF 10 | 90,071 B |
| `darboux` | `discrete-exact-steps` | n 4, 8, 16, 32, 16, 8, 4 through "Zgosti razdelitev", a fresh route per checkpoint | CRF 10 | 90,975 B |

Deviations and decisions:

- Start values: the table's `ph-*` path (0 → recipe → 0), stepped n = 1, 2, 4, … and φ −π…π do not start at the recipe state, which acceptance criterion 2 requires. The clips start and end at the recipe values instead. `ph-cubic` passes through the curve to the other side because its curvature never limits the d < 0 side (cusp where d·κ = −1); the capture asserts that rule.
- `spline-g1`: `b 1` moves N2 and, through the chain N3 = P3 + b2(P3 − N2), also N3 (`G1QuadraticBezierSpline.ts`), so "only that join's leg changes" was wrong; both computed points and G1 collinearity at both joins are asserted. The recipe gained the window [−6.5, 4, 5.5, −5] (the union over the sweep), so poster and clip share one camera. The slider's aria-valuetext shows float noise (`0,637900000000000023`); the capture compares it numerically.
- `darboux` has no n input and cannot decrease n, so each checkpoint is a fresh route with k presses of the refine button. Its reference sums take endpoint inf/sup, exact only because x² is monotone on [0, 2].
- Dropped after review: `rational-decasteljau` (the recipe shows no interpolation levels, so its sweep only moved a colour split along a static curve) and `ph-quintic` (an offset of 0.2 is about 10 px at card size and repeats `ph-cubic`). A larger `ph-quintic` amplitude is possible on owner request.
- Dropped by owner decision (2026-10-17): `subdivision`. The recipe and poster show the state after Subdivide, which resets the split parameter to 1 (`SubdivisionGraph1.tsx`); the table's sweep before Subdivide therefore cannot start or end at the poster state. The alternatives were moving the poster to a pre-Subdivide state, which would lose the split pieces the card teaches, or accepting a clip that does not match its poster, against acceptance criterion 2. It keeps its still. `ph-quintic` also stays dropped, with no larger amplitude.
- Accepted limitations at card size: `definite-integral`'s board caption "integral 2,6667" is crossed by the static curve in every frame, poster included, and n = 48 renders as a stripe texture; `darboux` n = 32 is dense; the trigonometric curve crosses the −0.5 tick label, as in its poster. The phase shift and the offset side flip are illustrated only in motion, but the posters and route controls carry each concept.
- Workers needed a lightweight two-frame settle for sweeps whose full MathJax re-typeset crashed the renderer, as `farin` did.
- Reviews: the math review confirmed every identity against the runtime (PH offset side and cusp rule, G1 chain, Riemann/Darboux sums and formatting, π/12 snapping) and found no vacuous checks. The visual review found no loop jumps.
