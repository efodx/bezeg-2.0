# Complex maps: a "Maps of the plane" family, a graph per lesson until Batch C, and the 0.05 operand grid

Accepted on 2026-10-31 (F0 of the [complex maps spec](../specs/complex-maps-lessons.md), stream `maps`). The spec lists three ADR decisions. Decisions 2 and 3 are recorded here with the family placement, which also revises the placement in [ADR 0025](0025-linear-map-graph-and-snapped-matrices.md) §1. Decision 1 (drawing the images of circles and lines) is recorded after the Batch B sampling measurement and before Batch C.

## 1. Placement: a new `maps` family, *Preslikave ravnine / Maps of the plane*

The linear map Demonstration and the new complex map Demonstrations form one catalog family `maps`. ADR 0025 placed the linear map in `basics` (*Osnove*). That fits one matrix graph, but not the five complex Demonstrations: Möbius maps and disc automorphisms are university content, not basics, and the stream adds six plane-map Demonstrations in all. Nothing was registered under ADR 0025, so the change costs nothing. The released `complex-multiplication` Demonstration stays in `basics`, with its route and Presets unchanged.

Alternatives:

- `basics` for all. No new family, but *Osnove* would hold eight entries, most of them not basic.
- `analysis` for the complex maps. Möbius maps belong to *Analiza 2b*, but M1–M2 are matura topics, and the linear map would sit in a different family from its complex neighbours.
- Move `complex-multiplication` into `maps`. More coherent, but it changes a released catalog placement without need. The route would not change, so this can be done later.

A family is one entry in `families` in `src/demonstrations.ts` and one title key. Registration follows what Platform A10 leaves in place.

## 2. Graphs: one per lesson for Batches A and B; Batch C revisits

Batch A has `ComplexReciprocalGraph` (M1) and `ComplexRootsGraph` (M2), and Batch B has `ComplexSquareGraph` (M3). Each has its own model and Preset fields, following the Analysis pattern and `ComplexMultiplicationGraph`. Their models are small and their controls differ.

Before Batch C, the handler decides whether M4 and M5 share one `ComplexMobiusGraph` with a mode. They share the generalized-circle drawing, the pole and \(\infty\) handling and the clipping, and \(\varphi_a\) is a Möbius map. The default is one graph with modes `general | disc`, unless the Batch C brief finds a reason against it.

Alternative: one `ComplexMapGraph` with a map choice for all five lessons. It would share clipping and the grid, but M1 and M2 have no grid image, and one Preset schema with five sets of fields would be validated case by case.

## 3. Operand domain: the existing 0.05 grid in [−2, 2]

Dragged and typed complex numbers (\(z\), \(w\), Möbius coefficients, circle data, \(a\)) stay on the grid of `src/analysis/complex.ts`. The exact predicates \(|z|=1\), \(|a|<1\), \(cz+d=0\) and \(A'=0\) are computed in integer units of \(1/20\). Images may lie anywhere. No lesson needs a free-double source mode. The spec's second Möbius example has an off-grid pole, and the status reports its distance instead of testing equality.

Alternative: a free-double mode with inexact status. It would let a learner hit an irrational pole, but every exact status would then need a tolerance variant, and the lessons gain nothing from it.

## Deferred: image drawing

The spec recommends analytic images from \(H'\) for Möbius maps and inversion, with sampling only for \(z^2\). The ADR that accepts or replaces it cites the Batch B sampling measurement (11 and 21 lines per direction) and a circle-image measurement.

## Consequences

- Additive only: new Demonstrations, routes and Preset collections in a new family. `complex-multiplication` and its lesson, route and Presets are unchanged.
- The linear map (ADR 0025) registers in `maps`, not `basics`.
- New closed-set lesson names go into `src/learning/model.ts`. Existing names are not renamed.
