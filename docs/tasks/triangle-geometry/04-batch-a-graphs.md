# 04 Batch A graphs: notable points and inscribed angle (F2a, `G-CG`)

Spec: T1 and T2 graph needs and acceptance; Implementation Decisions; batch gate items 3–4. Decisions: ADR 0030 §2. Pattern: the point-set/polygon graph of [convexity task 05](../convexity-hulls/05-point-set-graph.md). Use its triangle mode, or a three-vertex graph with the same snapping, numeric fields and keyboard moves. The geometry stream owns the shared graph's interface, so request changes through its stream file.

Scope: models and graphs under `src/compgeo/` and `src/graphs/compgeo/`, their tests, Preset validators, and one localization block per graph. No route or registration (task 05). May be split into two worker slices, one per graph.

Acceptance:

1. Notable points graph: three snapped vertices with numeric fields; independent toggles for each centre with its construction lines and circle; a text classification chip; readouts \(S\), \(R\), \(r\) with exact fractions for \(O\) and \(H\); a text list of coordinates; the degenerate state without `NaN`; and the far-circumcentre rule of T1 acceptance 5 ("outside the view", Show all, never a non-finite board coordinate).
2. Inscribed angle graph: circle, chord end points, glider \(P\) with a numeric \(t\) field and arrow-key steps, angle readouts to \(0.1^\circ\) labelled "to the displayed precision", and \(t\) avoiding \(A\) and \(B\).
3. Presets store vertices, example id, glider \(t\) and toggles. Import validates integer range and accepts collinear triangles. Reset, restore, owned and disposed board objects, and a live language switch that updates board text.
4. A drag with all overlays on is measured before any optimization.

Checks: path-filtered `just unit`, `npx tsc --noEmit --pretty false`, production build, full unit suite once. Review: engineering + UI/accessibility.
