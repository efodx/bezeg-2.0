# Wave 3 slice O1 brief: one curve operation panel

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `o1`. Decision 64 (search `^64\.`), C6 and C15 in the catalogue, *Likely exceptions* row "Rational Reset weight".

## Rows (from `w3-triage.md`)

C15-01 to C15-07.

## Owned paths

`src/graphs/base/CurveWorkspaceControls.tsx`, `src/graphs/base/controls/BezierCurveControls.tsx`, `RationalBezierCurveControls.tsx`, `PhBezierCurveControls.tsx`, `src/graphs/base/BaseCurveGraph.tsx` (only where the panel is mounted), `src/graphs/curves/bezier/{Extrapolation,Elevation,Subdivision}Graph.tsx`, `src/graphs/curves/rational/` Extrapolation, Elevation and Subdivision variants, their tests and CSS rules for these panels (`WorkspaceControls.css` rules that name these panels only). `sl.ts`/`en.ts` shared (Edit tool only).

Another worker (R1f) runs at the same time on new readout parts in `src/graphs/base/controls/` and the compgeo readouts. Do not touch those.

## Work

1. Before changing anything, write a short matrix in `w3-o1.md`: for each operation and panel, what Preview does (shown on the board? cleared on edit, on tool change, on Apply?), what Apply does, the parameter control and its range, refusals and their reasons, lesson actions that drive it (search `src/learning`), and Preset fields involved.
2. Implement decision 64: one operation panel on `BezierCurveControls`' pressed-preview model; `CurveWorkspaceControls` and the three graphs (and rational versions) use it. Apply and other unavailable buttons are `UnavailableButton`s with reasons. Rational Reset weight stays (named exception) inside the panel; the `rational-weight-*` hooks get a CSS rule or go.
3. Every matrix row keeps its behaviour unless decision 64 changes it; list each visible change for *User impact*. Mathematical results (subdivided, extrapolated, elevated curves) are unchanged: keep or add a test comparing control points before and after for one case per operation.

## Checks

Common checks plus `just unit src/graphs/curves src/graphs/base/controls` and the curve lesson tests that drive these operations. Name e2e tests under `tests/` that locate these buttons (do not run them). For each new assertion, an observed failure in `w3-o1.md`.
