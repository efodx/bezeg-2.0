# Guided lesson rollout

**Status:** original 26-route rollout released under the [owner's 2026-10-24 release policy](../guardrails.md#release-policy--owner-decision-2026-10-24). Consolidated capability ownership and eight missing smoke rows remain concrete follow-ups; owner language and physical-device/classroom sign-offs are removed as gates.

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

The original 26 routes below have released lessons, including the early expansion (`rational-decasteljau`, `elevation`, `rational`, `ph-quintic`, `affine`) and Cohorts B–E. The [content blueprint](guided-lessons-content-expansion.md) and cohort tasks record implemented action seams and verification. Later function and analysis lessons extend beyond this inventory. In the historical matrix, “draft” identifies the original cohort record, not a current release blocker. The [owner policy](../guardrails.md#release-policy--owner-decision-2026-10-24) resolves the earlier availability/review discrepancy and removes general language and physical-device/projector/classroom gates. Concrete defects and missing checks remain follow-ups.

## Capability matrix

This matrix is the gate between route inventory and implementation. “Discovery” means the graph must be inspected and measured before lesson content or actions are written; it is not permission to infer controls from a similar route.

| Demonstration | Family | Current status | Capability focus for discovery or review |
| --- | --- | --- | --- |
| `bernstein` | Foundations | Cohort B draft | `bernstein-degree` (0–5) and `bernstein-stacked-area` actions; partition of unity and nonnegativity |
| `bezier` | Polynomial Bézier | Pilot draft | control polygon, hull, evaluation point, control-point observation |
| `decasteljau` | Polynomial Bézier | Pilot draft | construction visibility, `t`, graph-owned animation |
| `decasteljau-alternative` | Polynomial Bézier | Cohort E draft | alternative construction and overlapping-curve semantics |
| `affine` | Polynomial Bézier | Expansion draft | translation, scale, and invariant observations; rotation/reflection center semantics remain open |
| `subdivision` | Polynomial Bézier | Cohort D draft | subdivision parameter, split curves, endpoint correspondence |
| `repeated-subdivision` | Polynomial Bézier | Cohort D draft | repeated split state and generated-curve ownership |
| `extrapolation` | Polynomial Bézier | Cohort D draft | extrapolation parameter and valid domain |
| `elevation` | Polynomial Bézier | Expansion draft | degree elevation and shape invariance |
| `rational` | Rational Bézier | Expansion draft | weights, standard form, and valid weight states |
| `rational-decasteljau` | Rational Bézier | Expansion draft | rational construction rows and weight semantics |
| `rational-elevation` | Rational Bézier | Cohort B draft | `degree-elevation` with effective weights; homogeneous elevation and shape invariance |
| `rational-extrapolation` | Rational Bézier | Cohort D draft | rational extrapolation domain and validity |
| `rational-subdivision` | Rational Bézier | Cohort D draft | rational subdivision and generated curves |
| `farin` | Rational Bézier | Cohort E draft | Farin points and their geometric meaning |
| `circle` | Rational Bézier | Cohort E draft | piece count, weights, and circle approximation claims |
| `spline-cn` | Splines | Cohort E draft | continuity order and derived-point constraints |
| `spline-c1` | Splines | Cohort E draft | C¹ continuity and editable inputs |
| `spline-c2` | Splines | Cohort E draft | C² continuity and editable inputs |
| `spline-g1` | Splines | Cohort E draft | one-sided G¹ continuity and invariants |
| `spline-g1-symmetric` | Splines | Cohort E draft | symmetric G¹ construction and invariants |
| `ph-cubic` | PH | Pilot draft | hodograph, offset visibility, offset distance |
| `ph-quintic` | PH | Expansion draft | quintic hodograph, speed, and offset semantics |
| `spline-parameterization` | Parameterization | Cohort E draft | alpha sets knot spacing and changes the C² spline shape; restore must reapply curve-owned alpha |
| `weighted-parameterization` | Parameterization | Cohort C draft | `parameterization-alpha`/`-samples`; rational reparameterization, symmetry, unchanged curve |
| `uniform-parameterization` | Parameterization | Cohort C draft | adds `parameterization-mode`; polynomial PH arc length and approximately equal-arc-length samples |

Each row must eventually gain: a reviewed lesson ID or an explicit no-fit decision, supported typed actions, prepared scene description, expected observation, mathematical checks, Slovenian and English review status, and browser/device evidence. Existing cohort records supply much of the implementation evidence; consolidation, named ownership, and outstanding review evidence remain open. The references to 26 active demonstrations in the original criteria below describe this rollout's historical scope, not today's full route count.

## Acceptance criteria

- The matrix covers all 26 active Demonstrations and records an owner for every unresolved row.
- The Learn entry lists supported released lesson IDs. Available implemented drafts count as released; unsupported or no-fit routes retain their existing exploration experience. Separate owner review is not an availability gate.
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
- [Implement Cohort C (`weighted-parameterization`, `uniform-parameterization`)](../tasks/guided-lessons-rollout/implement-cohort-c.md)
- [Implement Cohort D (subdivision and extrapolation)](../tasks/guided-lessons-rollout/implement-cohort-d.md)
- [Implement Cohort E (splines, Farin points, circle, alternative De Casteljau)](../tasks/guided-lessons-rollout/implement-cohort-e.md)
