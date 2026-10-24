# Bézier chapter activity script

Status: activity script implemented in the published [standalone learning pilot](standalone-learning.md) on 2026-10-20. [Implementation evidence](../reviews/standalone-learning/implementation.md) records real-board, browser and hosted checks; owner terminology/content approval and physical-device/classroom review remain open. Bilingual reading source copy is in [Slovenian](../content/bezier-curves.sl.md) and [English](../content/bezier-curves.en.md).

## Identity and entry

Chapter ID: `bezier-curves`. The registry owns each demonstration, starting scene, and named return section below. Append `?chapter=bezier-curves&activity=<activity-id>` to the canonical route. These are future activity destinations; today the chapter context is not implemented. Stable section IDs are identical in both languages.

| Activity | Canonical route | Named return section |
| --- | --- | --- |
| `shape-control` | `/bezeg-2.0/bezier/curve` | `control-points` |
| `curve-parameter` | `/bezeg-2.0/bezier/decasteljau` | `parameter` |
| `repeated-interpolation` | `/bezeg-2.0/bezier/decasteljau` | `interpolation` |
| `blending-coefficients` | `/bezeg-2.0/bernstein` | `bernstein-form` |
| `geometric-bounds` | `/bezeg-2.0/bezier/curve` | `geometric-properties` |
| `transform-shape` | `/bezeg-2.0/bezier/affine` | `affine-transformations` |

An in-app invocation also records its actual section, scroll position, and focus target. The opening motivation may launch `shape-control`; returning to that invocation restores the motivation location. Its named section is the fallback for a shared URL. Related-reading links from ordinary graphs use the four primary sections specified in the parent spec.

## Authored examples

**Ordinary cubic:** \(P_0=(-4,-3),P_1=(-3,2),P_2=(2,2),P_3=(3,-2)\). Its midpoint is \(B(1/2)=(-1/2,7/8)\). Used independently by `shape-control` and `geometric-bounds`.

**De Casteljau quartic:** \(P_0=(-4,-3),P_1=(-3,2),P_2=(0,3),P_3=(3,2),P_4=(4,-3)\). Its midpoint is \(B(1/2)=(0,7/4)\). Both De Casteljau activities use this default, with separate snapshots. Display “Primer stopnje \(4\)” / “Degree-\(4\) example” at entry. It is distinct from the cubic worked in the reading and the quadratic used to derive the formula.

**Bernstein quadratic:** degree \(2\), three basis functions, ordinary view initially. The activity matches the quadratic expansion, rather than the preceding cubic worked calculation. No linked curve or cursor is implied.

**Affine cubic:** \(P_0=(-3,2),P_1=(0,-2),P_2=(1,2),P_3=(3,-2)\). Display “Drug kubični primer” / “A different cubic example”. The initial midpoint is \((3/8,0)\). A horizontal translation by \(1/2\) moves it to \((7/8,0)\); this gives an exact implementation check, without requiring a midpoint marker in the activity.

## Activity sequence and observations

Learner-facing launch labels, prompts, and return explanations live in the two content files. The following scene and observation requirements constrain their implementation. They invite investigation; returning to reading always remains available, without a submitted answer or completion condition.

| Activity | First entry / Reset example | Investigation and return interpretation |
| --- | --- | --- |
| `shape-control` | Prepare ordinary cubic; show control points and polygon, hide hull and construction; no playback. | Move one interior control, then an endpoint. Endpoints interpolate the first/last controls; interior controls guide the curve without generally lying on it. Interior influence extends across the open parameter interval. |
| `curve-parameter` | Prepare labeled quartic, construction and full curve visible, \(t=1/2\), paused. | Vary \(t\) without dragging controls. Construction points move along a fixed curve; equal parameter increments need not mean equal distances. Return to `parameter`. |
| `repeated-interpolation` | Same authored quartic and paused midpoint, independent from `curve-parameter`. | Inspect successive rows, then vary \(t\). Every row uses the same interpolation fraction; the final point is \(B(t)\). The reading's quadratic derivation is a smaller explanatory example. |
| `blending-coefficients` | Prepare Bernstein degree \(2\), ordinary view, stacked-area control available. | Observe the three nonnegative basis functions; enable stacked view to inspect their total height. At \(t=1/2\) the values are \((1/4,1/2,1/4)\). The reading proves the sum identity; a sampled plot illustrates it. |
| `geometric-bounds` | Prepare ordinary cubic with points, polygon, and hull visible; construction hidden. | Move controls and compare curve/hull. The polygon connects controls in order; the hull is the smallest convex set containing them. Containment holds on \([0,1]\), including degenerate hulls, and is justified in the reading. |
| `transform-shape` | Prepare labeled affine default, controls and polygon visible; no transform pre-applied. | Use horizontal/vertical translation, then optionally scale, rotate, or reflect. Every control and the curve undergo the same affine map. Reset restores this authored example; return explains the weighted-sum identity. |

Each essential task needs a usable keyboard/non-drag path and an accessible description of its relevant changes. Graph dragging alone is insufficient for release. During implementation audit the existing point-edit controls and add only the narrow missing path if necessary; verify its graph/control agreement. Preserve the graph's full inspector, presentation, presets, and export access.

## Current action mapping and missing capability

Source audit at `8f8aed4` (2026-10-20), not browser evidence:

- `BaseGraph.registerLessonActions` accepts `prepared-scene` from `demonstration-default`. Prepare through graph-owned initialization when ready; the scene ID is registry metadata, not an arbitrary geometry payload. This uses the in-memory authored default, with no browser-local preset write.
- `curveLessonActions` handles `curve-visibility` for polygon, hull, and construction. Compose default preparation and visibility actions synchronously; controls must read the resulting scene store, including later actions in the same tick.
- `DecasteljauGraph.registerLessonActions` handles `parameter` with target `t`, and `animation` with target `decasteljau`. Pause and set the midpoint before allowing playback. Its visible `wholeCurve` switch currently writes graph state directly; there is **no typed whole-curve action**. Add a narrowly scoped graph-owned action and capability check before these activities ship. Verify both the displayed full curve and construction after the synchronous preparation sequence and after Reset.
- `BernsteinGraph` handles `bernstein-degree` and `bernstein-stacked-area`. Its internal `n` counts basis functions: use the public degree action with degree \(2\), which sets internal `n` to \(3\). Do not copy the internal count as the mathematical degree.
- `AffineTransformsBezierCurveGraph` handles `affine-transform` for translations, scaling, rotation, and reflection. Preparation should leave its default untransformed. Translation buttons already provide a non-drag exploration path. Scaling/rotation use the existing model's centers; this chapter does not claim an origin-centered operation.
- Existing lesson checkpoints are a starting seam, not proof of complete chapter snapshots. Audit geometry, view, selection, drawn parameter, graph options, and cleanup before reuse. The chapter runtime must satisfy the parent spec's scene ownership and rollback contract.

No custom-control-point action, linked Bernstein/curve board, per-row construction reveal, or general affine editor is required. Retain the explicitly different examples.

## Acceptance evidence to capture during implementation

For all six IDs, record the starting geometry/options, independent edited snapshot, explicit reset, return section/focus/scroll, and paused reopening. For both De Casteljau activities, check \(t=0,1/2,1\), whole-curve visibility, construction rows, and equality of the drawn parameter and control readout after pause/reset/restore. For Bernstein, verify three functions and both views after reset and language switching. For affine, check the exact translation above against the board/model and readout where shown.

Run the full navigation, failure/rollback, ownership, localization, accessibility, and hosting verification in [the parent specification](standalone-learning.md#verification-required-for-implementation). No runtime acceptance is established by this document.
