# Guided lesson rollout

**Status:** accepted planning spec

**Source:** [Guided lessons](guided-lessons.md), [ADR 0002](../adr/0002-guided-lessons-static-content-and-graph-capabilities.md), and [ADR 0004](../adr/0004-staged-guided-lesson-rollout.md)

The next bounded content cohort and its route-level acceptance gates are defined in the [content expansion blueprint](guided-lessons-content-expansion.md).

## Goal

Expand the implemented Guided lesson pilot and capability-aligned drafts across Bezeg without exposing unsupported, unreviewed, or pedagogically artificial lessons. The graph remains the mathematical owner and the existing route, Preset, and client-only contracts remain unchanged.

## Rollout cohorts

1. Review and release the three pilots: `bezier`, `decasteljau`, and `ph-cubic`.
2. Review the first expansion batch: `rational-decasteljau`, `elevation`, `rational`, `ph-quintic`, and `affine`.
3. Add Foundations and the remaining polynomial Bézier demonstrations.
4. Add the remaining rational Bézier, PH, and parameterization demonstrations.
5. Add spline demonstrations.

Within a cohort, a route receives a lesson only when its capability row and content review are complete. Shared content fragments are allowed, but each route keeps its own lesson identity when its scene or expected observation differs.

The current implementation includes five capability-aligned expansion drafts ahead of the full cohort sequence: `rational-decasteljau` reuses the existing rational De Casteljau graph seam, `elevation` adds one graph-owned degree-elevation action, `rational` uses weighted evaluation and weight-label actions, `ph-quintic` uses offset actions, and `affine` uses translation and scale actions. They remain draft content and are not classroom-ready; the remaining routes stay behind the same capability, mathematical, localization, and device-review gates.

## Capability matrix

This matrix is the gate between route inventory and implementation. “Discovery” means the graph must be inspected and measured before lesson content or actions are written; it is not permission to infer controls from a similar route.

| Demonstration | Family | Current status | Capability focus for discovery or review |
| --- | --- | --- | --- |
| `bernstein` | Foundations | Discovery | degree and basis-visualization actions |
| `bezier` | Polynomial Bézier | Pilot draft | control polygon, hull, evaluation point, control-point observation |
| `decasteljau` | Polynomial Bézier | Pilot draft | construction visibility, `t`, graph-owned animation |
| `decasteljau-alternative` | Polynomial Bézier | Discovery | alternative construction and overlapping-curve semantics |
| `affine` | Polynomial Bézier | Expansion draft | translation, scale, and invariant observations; rotation/reflection center semantics remain open |
| `subdivision` | Polynomial Bézier | Discovery | subdivision parameter, split curves, endpoint correspondence |
| `repeated-subdivision` | Polynomial Bézier | Discovery | repeated split state and generated-curve ownership |
| `extrapolation` | Polynomial Bézier | Discovery | extrapolation parameter and valid domain |
| `elevation` | Polynomial Bézier | Expansion draft | degree elevation and shape invariance |
| `rational` | Rational Bézier | Expansion draft | weights, standard form, and valid weight states |
| `rational-decasteljau` | Rational Bézier | Expansion draft | rational construction rows and weight semantics |
| `rational-elevation` | Rational Bézier | Discovery | rational degree elevation and invariance |
| `rational-extrapolation` | Rational Bézier | Discovery | rational extrapolation domain and validity |
| `rational-subdivision` | Rational Bézier | Discovery | rational subdivision and generated curves |
| `farin` | Rational Bézier | Discovery | Farin points and their geometric meaning |
| `circle` | Rational Bézier | Discovery | piece count, weights, and circle approximation claims |
| `spline-cn` | Splines | Discovery | continuity order and derived-point constraints |
| `spline-c1` | Splines | Discovery | C¹ continuity and editable inputs |
| `spline-c2` | Splines | Discovery | C² continuity and editable inputs |
| `spline-g1` | Splines | Discovery | one-sided G¹ continuity and invariants |
| `spline-g1-symmetric` | Splines | Discovery | symmetric G¹ construction and invariants |
| `ph-cubic` | PH | Pilot draft | hodograph, offset visibility, offset distance |
| `ph-quintic` | PH | Expansion draft | quintic hodograph, speed, and offset semantics |
| `spline-parameterization` | Parameterization | Discovery | alpha parameter and spline parameter distribution |
| `weighted-parameterization` | Parameterization | Discovery | weighting rule and geometric effect |
| `uniform-parameterization` | Parameterization | Discovery | uniform parameter rule and comparison |

Each row must eventually gain: a reviewed lesson ID or an explicit no-fit decision, supported typed actions, prepared scene description, expected observation, mathematical checks, Slovenian and English review status, and browser/device evidence.

## Acceptance criteria

- The matrix covers all 26 active Demonstrations and records an owner for every unresolved row.
- The Learn entry is allowlisted by reviewed lesson ID; unreviewed or no-fit routes retain their existing exploration experience.
- Each released lesson has bounded linear frames, complete Slovenian and English copy, source-backed mathematics, supported scenes, and no hidden control simulation.
- Each released scene has construction-specific or numerical checks and restores the pre-lesson in-memory state without changing Presets.
- Each cohort passes desktop, projection, narrow-screen, keyboard, touch, localization, animation, route-transition, and repeated entry/exit review.
- Existing routes, Preset identifiers, import/export formats, and graph algorithms remain unchanged.

## Verification evidence

Use focused runtime/content tests first, then production-browser review for every released route. Keep the existing mathematical checks green, fix the baseline starter-test failure before broad rollout, and record any no-fit decision with its reason rather than weakening the capability contract.

## Implementation tasks

- [Build the capability matrix](../tasks/guided-lessons-rollout/build-capability-matrix.md)
- [Review and release the pilots](../tasks/guided-lessons-rollout/review-and-release-pilot.md)
- [Extend the polynomial Bézier cohort](../tasks/guided-lessons-rollout/extend-polynomial-bezier-cohort.md)
- [Implement Cohort B (`bernstein`, `rational-elevation`)](../tasks/guided-lessons-rollout/implement-cohort-b.md)
