# 03 Batch A graphs: reciprocal and roots (F2a)

Spec: M1 and M2 graph needs and acceptance; batch gate items 3–4. Decisions: ADR 0029 §2–3. Pattern: `src/analysis/complexModel.ts`, `src/graphs/complex/ComplexMultiplicationGraph.tsx`, Preset fields in `src/graphs/functions/functionPresetCollections.ts`. Re-read Platform A7/A8 results on `master` if `G-FN` has opened by then and follow their function-model rules.

Scope: `src/analysis/complexReciprocalModel.ts`, `src/analysis/complexRootsModel.ts`, `src/graphs/complex/ComplexReciprocalGraph.tsx`, `src/graphs/complex/ComplexRootsGraph.tsx`, their tests, Preset field validators, and one localization block per graph after the complex-multiplication keys, at the same position in `sl.ts` and `en.ts`. No route or registration (task 04). May be split into two worker slices, one per graph.

Acceptance:

1. Reciprocal graph: draggable \(z\) and \(w\) on the grid with numeric inputs, the unit circle, \(\bar z\), \(1/z\), \(w/z\), modulus and argument readouts, the \(z=0\) status, an optional inversion circle with draggable centre and radius (kernel task 01), text alternatives of every position.
2. Roots graph: draggable \(w\), \(n\in[2,8]\), indexed roots, the \(n\)-gon, an optional test \(z\) with \(z^n\), readouts in Cartesian and polar form, the \(w=0\) status without a polygon.
3. Presets validate every field with actionable messages; Reset; restore; board objects owned and disposed; live language switch updates board text.
4. The released complex multiplication tests pass unchanged.

Checks: path-filtered `just unit`, `npx tsc --noEmit --pretty false`, production build, full unit suite once. Review: engineering + UI/accessibility.
